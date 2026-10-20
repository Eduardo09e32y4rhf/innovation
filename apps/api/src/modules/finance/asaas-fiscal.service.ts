import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AsaasRejectedException, AsaasService, type AsaasFiscalInvoice } from './asaas.service';

/** Nota já resolvida: não precisa consultar o Asaas de novo. */
const FINAL_STATUS = ['AUTHORIZED', 'CANCELED'];
/**
 * Nota que falhou ou foi cancelada: pode ser agendada de novo.
 * CANCELLATION_DENIED fica de fora de propósito: a prefeitura negou o cancelamento, a nota SEGUE VÁLIDA e reemitir duplicaria o documento fiscal.
 */
const RETRYABLE_STATUS = ['ERROR', 'CANCELED', 'RETRY'];
/** Reserva de emissão: só uma chamada agenda a nota; uma reserva parada além do prazo é retomada (a nota órfã é achada pela listagem do Asaas). */
const CLAIM_TTL_MS = 10 * 60_000;
/** Espera entre tentativas quando o provedor está fora (minutos). Esgotou: vira ERROR e entra na fila de ajustes fiscais. */
export const EMISSION_BACKOFF_MINUTES = [5, 15, 60, 240, 720];
const PAID_AT_GATEWAY = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];
const MANUAL = 'NFSE_MANUAL_ADJUSTMENT';
const RESOLVED = 'NFSE_ADJUSTMENT_RESOLVED';

/** Falha definitiva de pré-condição (dado fiscal ausente ou divergente): repetir não adianta. */
export class FiscalPreconditionError extends Error {}

/** Lacunas na sequência numérica das notas (só números inteiros; devolve intervalos). */
export function findNumberingGaps(numbers: string[], cap = 50): Array<{ from: number; to: number }> {
  const values = [...new Set(numbers.filter((n) => /^\d{1,15}$/.test(n)).map(Number))].sort((a, b) => a - b);
  const gaps: Array<{ from: number; to: number }> = [];
  for (let i = 1; i < values.length && gaps.length < cap; i += 1) {
    if (values[i] - values[i - 1] > 1) gaps.push({ from: values[i - 1] + 1, to: values[i] - 1 });
  }
  return gaps;
}

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

/**
 * NFS-e pelo Asaas. Liga com ASAAS_NFSE_ENABLED=true e o serviço municipal (ASAAS_NFSE_SERVICE_ID ou ASAAS_NFSE_SERVICE_CODE).
 * Cada fatura paga recebe uma nota agendada para o dia; o webhook INVOICE_* e a rotina diária trazem número, PDF e XML.
 */
@Injectable()
export class AsaasFiscalService {
  private readonly logger = new Logger(AsaasFiscalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
    private readonly config: ConfigService,
  ) {}

  private env(key: string) {
    return (this.config.get<string>(key) ?? '').trim();
  }

  private percent(key: string) {
    const value = Number(this.env(key).replace(',', '.') || 0);
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 0;
  }

  /** Município no Portal Nacional da NFS-e: a lista de serviços não vem pela API, então só vale o código (municipalServiceCode). */
  private national() {
    return this.env('ASAAS_NFSE_NATIONAL').toLowerCase() === 'true';
  }

  /** O que falta para emitir. Vazio = pronto. */
  missing() {
    const missing: string[] = [];
    if (!this.asaas.isConfigured()) missing.push('ASAAS_API_KEY');
    if (this.env('ASAAS_NFSE_ENABLED').toLowerCase() !== 'true') missing.push('ASAAS_NFSE_ENABLED=true');
    if (this.national()) {
      if (!this.env('ASAAS_NFSE_SERVICE_CODE')) missing.push('ASAAS_NFSE_SERVICE_CODE (Portal Nacional não usa ASAAS_NFSE_SERVICE_ID)');
    } else if (!this.env('ASAAS_NFSE_SERVICE_ID') && !this.env('ASAAS_NFSE_SERVICE_CODE')) missing.push('ASAAS_NFSE_SERVICE_ID ou ASAAS_NFSE_SERVICE_CODE');
    return missing;
  }

  isEnabled() {
    return this.missing().length === 0;
  }

  health() {
    const missing = this.missing();
    return {
      enabled: missing.length === 0,
      missing,
      national: this.national(),
      service: (!this.national() && this.env('ASAAS_NFSE_SERVICE_ID')) || this.env('ASAAS_NFSE_SERVICE_CODE') || null,
      webhookEvents: ['INVOICE_CREATED', 'INVOICE_UPDATED', 'INVOICE_SYNCHRONIZED', 'INVOICE_AUTHORIZED', 'INVOICE_PROCESSING_CANCELLATION', 'INVOICE_CANCELED', 'INVOICE_CANCELLATION_DENIED', 'INVOICE_ERROR'],
    };
  }

  /** Testa na conta do Asaas se os dados fiscais (prefeitura, certificado) foram preenchidos. */
  async checkAccount() {
    if (!this.asaas.isConfigured()) return { ok: false, message: 'Asaas não configurado.' };
    try {
      const info = await this.asaas.getFiscalInfo();
      return info?.municipalInscription || info?.rpsSerie
        ? { ok: true, message: 'Dados fiscais encontrados na conta do Asaas.' }
        : { ok: false, message: 'Preencha os dados fiscais em Asaas > Notas fiscais > Configurações.' };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Não foi possível consultar os dados fiscais.' };
    }
  }

  /** Grava a nota do Asaas na fatura. Usado pelo webhook e pela consulta ativa. */
  async persist(invoiceId: string, nf: AsaasFiscalInvoice, event?: string) {
    const status = nf.status ?? (event === 'INVOICE_AUTHORIZED' ? 'AUTHORIZED' : event === 'INVOICE_CANCELED' ? 'CANCELED' : event === 'INVOICE_CANCELLATION_DENIED' ? 'CANCELLATION_DENIED' : undefined);
    if (status === 'CANCELLATION_DENIED') await this.openManualAdjustment(invoiceId, 'cancelamento_negado', { asaasInvoiceId: nf.id });
    return this.prisma.platformInvoice.update({
      where: { id: invoiceId },
      data: {
        asaasInvoiceId: nf.id,
        invoiceNumber: nf.number || undefined,
        invoiceSeries: nf.series || undefined,
        invoiceValidationCode: nf.validationCode || undefined,
        fiscalPdfUrl: nf.pdfUrl || undefined,
        fiscalXmlUrl: nf.xmlUrl || undefined,
        invoiceStatus: status,
        nfeStatus: status,
        invoiceAuthorizedAt: status === 'AUTHORIZED' ? new Date() : undefined,
        invoiceCanceledAt: status === 'CANCELED' ? new Date() : undefined,
      },
    });
  }

  /** Abre (uma vez) um item na fila de ajustes fiscais; só reabre depois que o anterior foi resolvido. */
  private async openManualAdjustment(invoiceId: string, reason: string, extra: Record<string, unknown> = {}) {
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId }, select: { companyId: true } });
    if (!invoice) return;
    const [last, resolved] = await Promise.all([
      this.prisma.auditLog.findFirst({ where: { action: MANUAL, entityId: invoiceId, metadata: { path: ['reason'], equals: reason } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      this.prisma.auditLog.findFirst({ where: { action: RESOLVED, entityId: invoiceId, metadata: { path: ['reason'], equals: reason } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ]);
    if (last && !(resolved && resolved.createdAt >= last.createdAt)) return;
    await this.prisma.auditLog.create({ data: { companyId: invoice.companyId, action: MANUAL, entity: 'PlatformInvoice', entityId: invoiceId, metadata: { reason, ...extra } } });
  }

  /** Tentativas de emissão desde a última reemissão manual (RESET). */
  private async attemptsSoFar(invoiceId: string) {
    const reset = await this.prisma.auditLog.findFirst({ where: { action: 'NFSE_EMISSION_RESET', entityId: invoiceId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    return this.prisma.auditLog.count({ where: { action: 'NFSE_EMISSION_RETRY', entityId: invoiceId, ...(reset ? { createdAt: { gt: reset.createdAt } } : {}) } });
  }

  private async retryIsDue(invoiceId: string) {
    const last = await this.prisma.auditLog.findFirst({ where: { action: 'NFSE_EMISSION_RETRY', entityId: invoiceId }, orderBy: { createdAt: 'desc' }, select: { metadata: true } });
    const next = (last?.metadata as { nextRetryAt?: string } | null)?.nextRetryAt;
    return !next || new Date(next).getTime() <= Date.now();
  }

  /** Só uma chamada agenda a nota: quem perde a corrida sai sem tocar no Asaas. */
  private async claimEmission(invoiceId: string) {
    const stale = new Date(Date.now() - CLAIM_TTL_MS);
    const { count } = await this.prisma.platformInvoice.updateMany({
      where: { id: invoiceId, OR: [{ asaasInvoiceId: null, invoiceStatus: null }, { invoiceStatus: { in: RETRYABLE_STATUS } }, { invoiceStatus: 'SCHEDULING', updatedAt: { lt: stale } }] },
      data: { invoiceStatus: 'SCHEDULING', nfeStatus: 'SCHEDULING' },
    });
    return count === 1;
  }

  private async releaseClaim(invoiceId: string, previous: string | null) {
    await this.prisma.platformInvoice.update({ where: { id: invoiceId }, data: { invoiceStatus: previous, nfeStatus: previous } }).catch(() => undefined);
  }

  /** Falha definitiva => ERROR + fila de ajustes. Falha do provedor => RETRY com espera crescente; esgotou => ERROR + alerta. */
  private async recordEmissionFailure(invoiceId: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId }, select: { companyId: true } });
    if (!invoice) return { status: 'ERROR' as const, message };
    const audit = (action: string, metadata: Record<string, unknown>) =>
      this.prisma.auditLog.create({ data: { companyId: invoice.companyId, action, entity: 'PlatformInvoice', entityId: invoiceId, metadata: metadata as never } }).catch(() => undefined);
    const permanent = error instanceof FiscalPreconditionError || error instanceof AsaasRejectedException;
    if (permanent) {
      await this.prisma.platformInvoice.update({ where: { id: invoiceId }, data: { invoiceStatus: 'ERROR', nfeStatus: 'ERROR' } }).catch(() => undefined);
      await audit('NFSE_EMISSION_REJECTED', { message });
      await this.openManualAdjustment(invoiceId, 'emissao_recusada', { message }).catch(() => undefined);
      this.logger.error(`NFS-e da fatura ${invoiceId} recusada (sem nova tentativa automática): ${message}`);
      return { status: 'ERROR' as const, message };
    }
    const attempt = (await this.attemptsSoFar(invoiceId)) + 1;
    if (attempt > EMISSION_BACKOFF_MINUTES.length) {
      await this.prisma.platformInvoice.update({ where: { id: invoiceId }, data: { invoiceStatus: 'ERROR', nfeStatus: 'ERROR' } }).catch(() => undefined);
      await audit('NFSE_EMISSION_EXHAUSTED', { attempts: attempt - 1, message });
      await this.openManualAdjustment(invoiceId, 'emissao_esgotada', { attempts: attempt - 1, message }).catch(() => undefined);
      this.logger.error(`ALERTA: NFS-e da fatura ${invoiceId} falhou ${attempt - 1}x e precisa de ação manual: ${message}`);
      return { status: 'ERROR' as const, message };
    }
    const nextRetryAt = new Date(Date.now() + EMISSION_BACKOFF_MINUTES[attempt - 1] * 60_000).toISOString();
    await this.prisma.platformInvoice.update({ where: { id: invoiceId }, data: { invoiceStatus: 'RETRY', nfeStatus: 'RETRY' } }).catch(() => undefined);
    await audit('NFSE_EMISSION_RETRY', { attempt, nextRetryAt, message });
    this.logger.warn(`NFS-e da fatura ${invoiceId}: tentativa ${attempt} falhou, nova em ${EMISSION_BACKOFF_MINUTES[attempt - 1]} min: ${message}`);
    return { status: 'RETRY' as const, message };
  }

  /**
   * Garante a nota de uma fatura paga: puxa a que já existe no Asaas ou agenda uma nova.
   * Nunca lança: falha de nota não pode travar pagamento nem webhook. Devolve o que aconteceu.
   * Nunca agenda duas notas: reserva atômica no banco + consulta prévia ao Asaas.
   */
  async ensureForInvoice(invoiceId: string, options: { force?: boolean } = {}): Promise<{ result: 'SKIPPED' | 'PULLED' | 'SCHEDULED' | 'FAILED'; message: string }> {
    const invoice = await this.prisma.platformInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, companyId: true, status: true, provider: true, asaasPaymentId: true, asaasInvoiceId: true, invoiceStatus: true, amount: true, description: true, deletedAt: true, refundStatus: true, company: { select: { document: true } } },
    });
    if (!invoice || invoice.deletedAt) return { result: 'SKIPPED', message: 'Fatura não encontrada.' };
    if (invoice.provider === 'MERCADOPAGO' || !invoice.asaasPaymentId) return { result: 'SKIPPED', message: 'A nota automática só vale para cobranças do Asaas. Anexe a nota manualmente.' };
    if (!this.asaas.isConfigured()) return { result: 'SKIPPED', message: 'Asaas não configurado.' };
    if (invoice.refundStatus === 'REFUNDED') return { result: 'SKIPPED', message: 'Fatura estornada: não emite nota.' };
    if (invoice.invoiceStatus === 'RETRY' && !options.force && !(await this.retryIsDue(invoice.id))) return { result: 'SKIPPED', message: 'Nova tentativa de emissão agendada; aguardando o prazo.' };

    // 1) Já tem nota ligada: só atualiza enquanto não chegou a um estado final. Falha de consulta não altera o estado da nota.
    if (invoice.asaasInvoiceId && !(options.force && RETRYABLE_STATUS.includes(invoice.invoiceStatus ?? ''))) {
      if (FINAL_STATUS.includes(invoice.invoiceStatus ?? '') && !options.force) return { result: 'SKIPPED', message: 'Nota já finalizada.' };
      try {
        const nf = await this.asaas.getFiscalInvoice(invoice.asaasInvoiceId);
        if (nf?.id) await this.persist(invoice.id, nf);
        return { result: 'PULLED', message: `Nota ${nf?.status ?? 'consultada'}.` };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Nota fiscal da fatura ${invoiceId}: consulta falhou, estado mantido: ${message}`);
        return { result: 'FAILED', message };
      }
    }

    let claimed = false;
    try {
      // 2) Procura nota criada direto no painel do Asaas (ou por emissão automática da conta, ou por tentativa anterior que caiu no meio) antes de agendar outra.
      const found = (await this.asaas.listInvoicesByPayment(invoice.asaasPaymentId)).data ?? [];
      const usable = found.find((nf) => !RETRYABLE_STATUS.includes(nf.status ?? ''));
      if (usable) {
        await this.persist(invoice.id, usable);
        return { result: 'PULLED', message: `Nota ${usable.status ?? 'encontrada'} no Asaas.` };
      }

      if (invoice.status !== 'PAID') return { result: 'SKIPPED', message: 'A nota é emitida depois do pagamento.' };
      const missing = this.missing();
      if (missing.length) return { result: 'SKIPPED', message: `Emissão de nota desligada. Falta: ${missing.join(', ')}.` };

      // 3) Reserva: se outra chamada já está emitindo, não agenda.
      if (!(await this.claimEmission(invoice.id))) return { result: 'SKIPPED', message: 'Emissão já em andamento para esta fatura.' };
      claimed = true;
      if (options.force) await this.prisma.auditLog.create({ data: { companyId: invoice.companyId, action: 'NFSE_EMISSION_RESET', entity: 'PlatformInvoice', entityId: invoice.id, metadata: {} } }).catch(() => undefined);

      // 4) Pré-condições: tomador, valor e pagamento confirmado no gateway.
      const document = (invoice.company?.document ?? '').replace(/\D/g, '');
      if (![11, 14].includes(document.length)) throw new FiscalPreconditionError('Tomador sem CPF/CNPJ válido no cadastro da empresa. Corrija o cadastro e reemita.');
      const amount = Number(invoice.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new FiscalPreconditionError('Valor da fatura inválido para emitir nota.');
      const charge = await this.asaas.getCharge(invoice.asaasPaymentId);
      if (!PAID_AT_GATEWAY.includes(charge?.status ?? '')) {
        await this.releaseClaim(invoice.id, invoice.invoiceStatus);
        claimed = false;
        return { result: 'SKIPPED', message: 'Pagamento ainda não confirmado no Asaas; a nota sai depois.' };
      }
      if (Math.abs(Number(charge.value) - amount) > 0.005) throw new FiscalPreconditionError(`Valor da cobrança no Asaas (R$ ${Number(charge.value).toFixed(2)}) difere da fatura (R$ ${amount.toFixed(2)}). Confira antes de emitir.`);

      // 5) Agenda a nota para hoje.
      const serviceId = this.national() ? '' : this.env('ASAAS_NFSE_SERVICE_ID');
      const nf = await this.asaas.scheduleFiscalInvoice({
        payment: invoice.asaasPaymentId,
        serviceDescription: this.env('ASAAS_NFSE_DESCRIPTION') || `Licença de uso do sistema Innovation RH. ${invoice.description ?? ''}`.trim(),
        observations: this.env('ASAAS_NFSE_OBSERVATIONS') || 'Serviço de software (SaaS) prestado por assinatura.',
        value: amount,
        deductions: 0,
        effectiveDate: today(),
        externalReference: `inv:${invoice.id}`,
        ...(serviceId
          ? { municipalServiceId: serviceId }
          : { municipalServiceCode: this.env('ASAAS_NFSE_SERVICE_CODE'), municipalServiceName: this.env('ASAAS_NFSE_SERVICE_NAME') || 'Licenciamento ou cessão de direito de uso de programas de computação' }),
        taxes: {
          retainIss: this.env('ASAAS_NFSE_RETAIN_ISS').toLowerCase() === 'true',
          iss: this.percent('ASAAS_NFSE_ISS'),
          cofins: this.percent('ASAAS_NFSE_COFINS'),
          csll: this.percent('ASAAS_NFSE_CSLL'),
          inss: this.percent('ASAAS_NFSE_INSS'),
          ir: this.percent('ASAAS_NFSE_IR'),
          pis: this.percent('ASAAS_NFSE_PIS'),
        },
      });
      if (!nf?.id) throw new Error('O Asaas não devolveu a nota agendada.');
      await this.persist(invoice.id, { ...nf, status: nf.status ?? 'SCHEDULED' });
      claimed = false;
      return { result: 'SCHEDULED', message: 'Nota agendada no Asaas. O número e o PDF chegam quando a prefeitura autorizar.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!claimed) {
        this.logger.warn(`Nota fiscal da fatura ${invoiceId}: ${message}`);
        return { result: 'FAILED', message };
      }
      const failure = await this.recordEmissionFailure(invoice.id, error);
      return { result: 'FAILED', message: failure.message };
    }
  }

  /**
   * Estorno total: cancela a NFS-e. Estorno parcial: a NF não aceita valor parcial, então só registra para ajuste manual.
   * Nunca lança. Idempotente: nota já cancelada ou em cancelamento é ignorada; falha vira CANCEL_PENDING e a rotina tenta de novo.
   */
  async handleRefund(invoiceId: string, refundStatus: string | null | 'CHARGEBACK') {
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId }, select: { id: true, companyId: true, asaasInvoiceId: true, invoiceStatus: true } });
    if (!invoice?.asaasInvoiceId) return { result: 'SKIPPED' as const };
    if (['CANCELED', 'PROCESSING_CANCELLATION'].includes(invoice.invoiceStatus ?? '')) return { result: 'SKIPPED' as const };

    // Chargeback pode ser revertido na disputa (PAYMENT_AWAITING_CHARGEBACK_REVERSAL): não cancela sozinho, sinaliza revisão.
    if (refundStatus === 'PARTIALLY_REFUNDED' || refundStatus === 'CHARGEBACK') {
      const reason = refundStatus === 'CHARGEBACK' ? 'chargeback' : 'estorno_parcial';
      const already = await this.prisma.auditLog.findFirst({ where: { action: 'NFSE_MANUAL_ADJUSTMENT', entityId: invoice.id, metadata: { path: ['reason'], equals: reason } }, select: { id: true } });
      if (!already) {
        await this.prisma.auditLog.create({ data: { companyId: invoice.companyId, action: 'NFSE_MANUAL_ADJUSTMENT', entity: 'PlatformInvoice', entityId: invoice.id, metadata: { reason, asaasInvoiceId: invoice.asaasInvoiceId } } });
        this.logger.warn(`Fatura ${invoice.id}: ${reason} — NFS-e ${invoice.asaasInvoiceId} exige revisão manual.`);
      }
      return { result: 'MANUAL' as const };
    }
    if (refundStatus !== 'REFUNDED') return { result: 'SKIPPED' as const };

    try {
      const nf = await this.asaas.cancelFiscalInvoice(invoice.asaasInvoiceId);
      await this.persist(invoice.id, { ...(nf ?? { id: invoice.asaasInvoiceId }), id: invoice.asaasInvoiceId, status: nf?.status ?? 'PROCESSING_CANCELLATION' });
      return { result: 'REQUESTED' as const };
    } catch (error) {
      this.logger.error(`Fatura ${invoice.id}: falha ao cancelar NFS-e ${invoice.asaasInvoiceId}: ${error instanceof Error ? error.message : String(error)}`);
      await this.prisma.platformInvoice.update({ where: { id: invoice.id }, data: { invoiceStatus: 'CANCEL_PENDING', nfeStatus: 'CANCEL_PENDING' } }).catch(() => undefined);
      return { result: 'FAILED' as const };
    }
  }

  /** Rotina: agenda notas que faltam e puxa as que ainda não foram autorizadas (cobre webhook perdido). */
  async reconcileRecent(days = 45, limit = 200) {
    if (!this.asaas.isConfigured()) return { checked: 0, numberingGaps: 0 };
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const invoices = await this.prisma.platformInvoice.findMany({
      where: {
        status: 'PAID', deletedAt: null, provider: { not: 'MERCADOPAGO' }, asaasPaymentId: { not: null }, paidAt: { gte: since },
        AND: [
          { OR: [{ asaasInvoiceId: null }, { invoiceStatus: null }, { invoiceStatus: { notIn: FINAL_STATUS } }] },
          // ERROR / cancelamento pendente ou negado dependem de ação manual ou de rotina própria: não ficam em laço aqui.
          { OR: [{ invoiceStatus: null }, { invoiceStatus: { notIn: ['ERROR', 'CANCEL_PENDING', 'PROCESSING_CANCELLATION', 'CANCELLATION_DENIED'] } }] },
          { OR: [{ refundStatus: null }, { refundStatus: { not: 'REFUNDED' } }] },
        ],
      },
      select: { id: true },
      orderBy: { paidAt: 'desc' },
      take: limit,
    });
    for (const invoice of invoices) await this.ensureForInvoice(invoice.id);
    const pendingCancel = await this.prisma.platformInvoice.findMany({ where: { invoiceStatus: 'CANCEL_PENDING', refundStatus: 'REFUNDED' }, select: { id: true }, take: limit });
    for (const invoice of pendingCancel) await this.handleRefund(invoice.id, 'REFUNDED');
    const gaps = (await this.numberingReport().catch(() => [])).reduce((sum, row) => sum + row.gaps.length, 0);
    if (gaps) this.logger.warn(`Numeração das NFS-e com ${gaps} lacuna(s). Confira no painel do Asaas (notas emitidas fora do sistema também geram lacunas aqui).`);
    return { checked: invoices.length + pendingCancel.length, numberingGaps: gaps };
  }

  /**
   * Lacunas na numeração das notas guardadas. A numeração (RPS/NFS-e) é atribuída pelo Asaas/prefeitura, não por este sistema:
   * aqui só detectamos saltos para alertar. Notas emitidas direto no painel do Asaas também aparecem como salto.
   */
  async numberingReport() {
    const rows = await this.prisma.platformInvoice.findMany({
      where: { invoiceNumber: { not: null }, invoiceStatus: { in: ['AUTHORIZED', 'CANCELED'] } },
      select: { invoiceNumber: true, invoiceSeries: true },
      take: 5000,
    });
    const bySeries = new Map<string, string[]>();
    for (const row of rows) bySeries.set(row.invoiceSeries ?? '', [...(bySeries.get(row.invoiceSeries ?? '') ?? []), String(row.invoiceNumber)]);
    return [...bySeries.entries()].map(([series, numbers]) => ({ series, gaps: findNumberingGaps(numbers) })).filter((row) => row.gaps.length);
  }
}
