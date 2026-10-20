import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLock } from '../../common/redis/cron-lock.decorator';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../database/prisma.service';
import { AsaasRejectedException, AsaasService, type AsaasPayment } from './asaas.service';
import { AsaasWebhookProcessorService } from './asaas-webhook.processor';
import { PaymentRefundService } from './payment-refund.service';

export type RemoteKind = 'OPEN' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'REFUND' | 'UNKNOWN';
export type DivergenceReason = 'REMOTA_INEXISTENTE' | 'LOCAL_PAGO_REMOTO_NAO_PAGO' | 'VALOR_DIVERGENTE' | 'SEM_COBRANCA_REMOTA' | 'REPARO_FALHOU' | 'ESTADO_NAO_CONVERGE';

export interface ReconciliationReport {
  checked: number;
  ok: number;
  healed: number;
  linked: number;
  diverged: number;
  resolved: number;
  errors: number;
  openDivergences: number;
}

const DIVERGENCE = 'PAYMENT_RECONCILIATION_DIVERGENCE';
const RESOLVED = 'PAYMENT_RECONCILIATION_RESOLVED';
const PAID_STATUS = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];

export function classifyRemoteStatus(status?: string): RemoteKind {
  if (!status) return 'UNKNOWN';
  if (PAID_STATUS.includes(status)) return 'PAID';
  if (status === 'OVERDUE') return 'OVERDUE';
  if (['REFUNDED', 'PARTIALLY_REFUNDED', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS'].includes(status)) return 'REFUND';
  if (['DELETED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL'].includes(status)) return 'CANCELED';
  return 'OPEN';
}

/** Evento equivalente ao estado remoto, para reaproveitar o processador de webhooks (mesmas regras de acesso, cupom e nota). */
export function healingEvent(local: string, remote: RemoteKind, remoteStatus?: string): string | null {
  if (remote === 'PAID' && local !== 'PAID') return remoteStatus === 'CONFIRMED' ? 'PAYMENT_CONFIRMED' : 'PAYMENT_RECEIVED';
  if (remote === 'OVERDUE' && local === 'OPEN') return 'PAYMENT_OVERDUE';
  if (remote === 'CANCELED' && local !== 'CANCELED') return remoteStatus === 'DELETED' ? 'PAYMENT_DELETED' : 'PAYMENT_CHARGEBACK_REQUESTED';
  return null;
}

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
    private readonly processor: AsaasWebhookProcessorService,
    private readonly redis: RedisService,
    private readonly refunds?: PaymentRefundService,
  ) {}

  /** Conciliação diária de faturas do Asaas: o estado remoto manda; divergência que não se resolve sozinha vira ajuste (AuditLog). */
  @Cron('10 */6 * * *')
  @CronLock('billing.reconcilePayments', 3000)
  async runScheduled() {
    const report = await this.reconcile();
    if (report.checked) this.logger.log(`RECONCILIACAO ${JSON.stringify(report)}`);
    if (report.openDivergences) this.logger.error(`OPERATIONAL_ALERT ${JSON.stringify({ condition: 'payment_divergence', count: report.openDivergences })}`);
  }

  async reconcile(options: { windowDays?: number; limit?: number; companyId?: string } = {}): Promise<ReconciliationReport> {
    const report: ReconciliationReport = { checked: 0, ok: 0, healed: 0, linked: 0, diverged: 0, resolved: 0, errors: 0, openDivergences: 0 };
    if (!this.asaas.isConfigured()) return report;
    const since = new Date(Date.now() - (options.windowDays ?? 7) * 86_400_000);
    const invoices = await this.prisma.platformInvoice.findMany({
      where: {
        deletedAt: null, provider: 'ASAAS', paymentProcessingStatus: { not: 'LOCAL' },
        ...(options.companyId ? { companyId: options.companyId } : {}),
        OR: [{ status: { in: ['OPEN', 'OVERDUE'] } }, { updatedAt: { gte: since } }],
      },
      orderBy: { updatedAt: 'asc' },
      take: options.limit ?? 300,
    });

    for (const invoice of invoices) {
      report.checked += 1;
      try {
        const outcome = await this.reconcileInvoice(invoice);
        if (outcome === 'OK') report.ok += 1;
        else if (outcome === 'HEALED') report.healed += 1;
        else if (outcome === 'LINKED') report.linked += 1;
        else report.diverged += 1;
        if (await this.resolveIfConverged(invoice.id, invoice.companyId, outcome)) report.resolved += 1;
      } catch (error) {
        report.errors += 1;
        this.logger.warn(`Conciliação da fatura ${invoice.id} falhou: ${String(error)}`);
      }
    }
    report.resolved += await this.sweepRemoved(options.companyId);
    report.openDivergences = await this.countOpenDivergences(options.companyId);
    return report;
  }

  private async reconcileInvoice(invoice: { id: string; companyId: string; status: string; amount: unknown; asaasPaymentId: string | null; paymentProcessingStatus: string; createdAt: Date }): Promise<'OK' | 'HEALED' | 'LINKED' | 'DIVERGED'> {
    // Resposta do Asaas perdida (timeout): acha a cobrança pela referência e liga, sem criar outra.
    if (!invoice.asaasPaymentId) {
      if (invoice.paymentProcessingStatus !== 'UNKNOWN' && invoice.paymentProcessingStatus !== 'PROCESSING') return 'OK';
      const found = await this.asaas.findChargesByReference(invoice.id);
      const matches = (found.data ?? []).filter((p) => p.externalReference === `inv:${invoice.id}` && Number(p.value) === Number(invoice.amount));
      if (!found.hasMore && matches.length === 1) {
        await this.prisma.platformInvoice.update({ where: { id: invoice.id }, data: { asaasPaymentId: matches[0].id, invoiceUrl: matches[0].invoiceUrl, paymentProcessingStatus: 'LINK_READY' } });
        return 'LINKED';
      }
      // Reservas recentes ainda podem estar em andamento: só vira divergência depois de 15 min.
      if (Date.now() - invoice.createdAt.getTime() < 15 * 60_000) return 'OK';
      await this.openDivergence(invoice, 'SEM_COBRANCA_REMOTA', { matches: matches.length });
      return 'DIVERGED';
    }

    let remote: AsaasPayment;
    try {
      remote = await this.asaas.getCharge(invoice.asaasPaymentId);
    } catch (error) {
      if (error instanceof AsaasRejectedException && ['OPEN', 'OVERDUE'].includes(invoice.status)) {
        await this.openDivergence(invoice, 'REMOTA_INEXISTENTE', { asaasPaymentId: invoice.asaasPaymentId });
        return 'DIVERGED';
      }
      throw error;
    }

    const kind = classifyRemoteStatus(remote.status);
    if (kind === 'REFUND') {
      if (this.refunds && invoice.status === 'PAID') await this.refunds.reconcile(invoice.id);
      return 'OK';
    }
    if (Number(remote.value) !== Number(invoice.amount) && !(await this.isSubscriptionRepricing(invoice.id))) {
      await this.openDivergence(invoice, 'VALOR_DIVERGENTE', { localAmount: Number(invoice.amount), remoteAmount: Number(remote.value) });
      return 'DIVERGED';
    }
    if (invoice.status === 'PAID' && (kind === 'OPEN' || kind === 'OVERDUE')) {
      // Nunca desfaz um pagamento local sozinho: pode ser baixa manual. Fica para decisão humana.
      await this.openDivergence(invoice, 'LOCAL_PAGO_REMOTO_NAO_PAGO', { remoteStatus: remote.status });
      return 'DIVERGED';
    }

    const event = healingEvent(invoice.status, kind, remote.status);
    if (!event) return 'OK';
    try {
      await this.applyEvent(invoice.id, event, remote);
    } catch (error) {
      await this.openDivergence(invoice, 'REPARO_FALHOU', { event, error: String(error).slice(0, 300) });
      return 'DIVERGED';
    }
    const after = await this.prisma.platformInvoice.findUnique({ where: { id: invoice.id }, select: { status: true } });
    if (after && healingEvent(after.status, kind, remote.status)) {
      await this.openDivergence(invoice, 'ESTADO_NAO_CONVERGE', { event, localStatus: after.status, remoteStatus: remote.status });
      return 'DIVERGED';
    }
    return 'HEALED';
  }

  private async isSubscriptionRepricing(invoiceId: string) {
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId }, select: { status: true, description: true } });
    return Boolean(invoice && invoice.status !== 'PAID' && /assinatura|mensalidade/i.test(invoice.description ?? ''));
  }

  /** Um evento por fatura/dia/tipo (id estável): reexecutar a conciliação não repete o reparo. */
  private async applyEvent(invoiceId: string, event: string, remote: AsaasPayment) {
    const asaasEventId = `reconcile:${remote.id}:${event}:${new Date().toISOString().slice(0, 10)}`;
    const payload = { id: asaasEventId, event, payment: { id: remote.id, customer: remote.customer, subscription: remote.subscription, externalReference: remote.externalReference ?? `inv:${invoiceId}`, value: Number(remote.value), dueDate: remote.dueDate, description: remote.description, billingType: remote.billingType, invoiceUrl: remote.invoiceUrl } };
    let stored = await this.prisma.asaasWebhookEvent.findUnique({ where: { asaasEventId } });
    if (!stored) stored = await this.prisma.asaasWebhookEvent.create({ data: { asaasEventId, eventType: event, payload: payload as any, status: 'PENDING' } });
    else if (stored.status === 'FAILED') await this.prisma.asaasWebhookEvent.update({ where: { id: stored.id }, data: { status: 'PENDING', errorMessage: null } });
    await this.processor.processStoredEvent(stored.id);
  }

  private async openDivergence(invoice: { id: string; companyId: string; status: string; asaasPaymentId: string | null }, reason: DivergenceReason, detail: Record<string, unknown>) {
    const recent = await this.prisma.auditLog.findFirst({
      where: { action: DIVERGENCE, entityId: invoice.id, createdAt: { gte: new Date(Date.now() - 86_400_000) }, metadata: { path: ['reason'], equals: reason } },
      select: { id: true },
    });
    if (recent) return;
    await this.prisma.auditLog.create({
      data: { companyId: invoice.companyId, action: DIVERGENCE, entity: 'PlatformInvoice', entityId: invoice.id, metadata: { reason, localStatus: invoice.status, asaasPaymentId: invoice.asaasPaymentId, ...detail } as any },
    });
    this.logger.error(`OPERATIONAL_ALERT ${JSON.stringify({ condition: 'payment_divergence', invoiceId: invoice.id, reason })}`);
  }

  /** Divergência de fatura que foi cancelada ou removida depois: não há mais o que conciliar, baixa o ajuste. */
  private async sweepRemoved(companyId?: string) {
    const rows = await this.prisma.auditLog.findMany({ where: { action: DIVERGENCE, ...(companyId ? { companyId } : {}) }, distinct: ['entityId'], select: { entityId: true, companyId: true }, take: 500 });
    let resolved = 0;
    for (const row of rows) {
      if (!row.entityId || !(await this.openDivergenceIds(row.entityId)).length) continue;
      const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: row.entityId }, select: { deletedAt: true, status: true } });
      if (invoice && !invoice.deletedAt && invoice.status !== 'CANCELED') continue;
      await this.prisma.auditLog.create({ data: { companyId: row.companyId, action: RESOLVED, entity: 'PlatformInvoice', entityId: row.entityId, metadata: { auto: true, reason: 'fatura_removida' } } });
      resolved += 1;
    }
    return resolved;
  }

  private async resolveIfConverged(invoiceId: string, companyId: string, outcome: string) {
    if (outcome === 'DIVERGED') return false;
    const open = await this.openDivergenceIds(invoiceId);
    if (!open.length) return false;
    await this.prisma.auditLog.create({ data: { companyId, action: RESOLVED, entity: 'PlatformInvoice', entityId: invoiceId, metadata: { auto: true, resolvedDivergences: open } as any } });
    return true;
  }

  private async openDivergenceIds(invoiceId: string) {
    const rows = await this.prisma.auditLog.findMany({ where: { entityId: invoiceId, action: { in: [DIVERGENCE, RESOLVED] } }, orderBy: { createdAt: 'asc' }, select: { id: true, action: true } });
    const open: string[] = [];
    for (const row of rows) {
      if (row.action === DIVERGENCE) open.push(row.id);
      else open.length = 0;
    }
    return open;
  }

  async countOpenDivergences(companyId?: string) {
    const ids = await this.prisma.auditLog.findMany({ where: { action: DIVERGENCE, ...(companyId ? { companyId } : {}) }, distinct: ['entityId'], select: { entityId: true }, take: 500 });
    let total = 0;
    for (const { entityId } of ids) if (entityId && (await this.openDivergenceIds(entityId)).length) total += 1;
    return total;
  }

  async listOpenDivergences(companyId?: string) {
    const rows = await this.prisma.auditLog.findMany({ where: { action: DIVERGENCE, ...(companyId ? { companyId } : {}) }, orderBy: { createdAt: 'desc' }, take: 300 });
    const items: typeof rows = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.entityId || seen.has(row.entityId)) continue;
      seen.add(row.entityId);
      if ((await this.openDivergenceIds(row.entityId)).length) items.push(row);
    }
    return items;
  }
}
