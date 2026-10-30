import { asaasUnhandledEvents } from './asaas-webhook-metrics';
import { webhookFailures } from '../../common/metrics/app-metrics';
import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { AsaasService } from './asaas.service';
import { FinanceNotificationService, FinanceNotificationType } from './finance-notification.service';
import { PricingService } from './pricing.service';
import { planPricingForSubscription, PricingPlanInput } from './pricing';
import { PaymentRefundService } from './payment-refund.service';
import { AsaasFiscalService } from './asaas-fiscal.service';
import { cancelRedundantSignupCharges } from './signup-charges';
import { companyDataAfterPayment, saoPauloToday } from './payment-access';

type InvoiceStatus = 'OPEN' | 'PAID' | 'OVERDUE' | 'CANCELED';

interface AsaasWebhookPayment {
  id: string;
  customer: string;
  subscription?: string;
  externalReference?: string;
  value: number;
  netValue?: number;
  dueDate?: string;
  description?: string;
  billingType?: string;
  invoiceUrl?: string;
  /** Estado real da cobranca no Asaas (PENDING, RECEIVED, CONFIRMED, OVERDUE, ...). */
  status?: string;
}

interface AsaasWebhookInvoice {
  id: string;
  payment?: string;
  status?: string;
  number?: string;
  series?: string;
  validationCode?: string;
  value?: number;
  pdfUrl?: string;
  xmlUrl?: string;
}

interface AsaasWebhookPayload {
  event?: string;
  payment?: AsaasWebhookPayment;
  invoice?: AsaasWebhookInvoice;
}

const PAYMENT_EVENT_MAP: Record<string, FinanceNotificationType | undefined> = {
  PAYMENT_CREATED: 'CHARGE_CREATED',
  PAYMENT_RESTORED: 'CHARGE_CREATED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED: 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED_IN_CASH: 'PAYMENT_CONFIRMED',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  PAYMENT_DELETED: 'PAYMENT_CANCELED',
  PAYMENT_CHARGEBACK_REQUESTED: 'PAYMENT_CANCELED',
  PAYMENT_CHARGEBACK_DISPUTE: 'PAYMENT_CANCELED',
};

const INVOICE_EVENT_MAP: Record<string, FinanceNotificationType | undefined> = {
  INVOICE_AUTHORIZED: 'INVOICE_AUTHORIZED',
  INVOICE_CANCELED: 'INVOICE_CANCELED',
};

// PAYMENT_REFUND_DENIED: "estorno negado" (boleto) - VIA BUSCA, docs.asaas.com/docs/webhook-para-cobrancas; apenas reconcilia o estado da devolucao.
const REFUND_EVENTS = ['PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED', 'PAYMENT_REFUND_IN_PROGRESS', 'PAYMENT_REFUND_DENIED'];

@Injectable()
export class AsaasWebhookProcessorService {
  private readonly logger = new Logger(AsaasWebhookProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: FinanceNotificationService,
    private readonly asaas: AsaasService,
    private readonly pricing: PricingService,
    private readonly refunds?: PaymentRefundService,
    private readonly fiscal?: AsaasFiscalService,
  ) {}

  async processStoredEvent(eventId: string) {
    const claimed = await this.prisma.asaasWebhookEvent.updateMany({
      where: { id: eventId, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'PROCESSING', attempts: { increment: 1 }, errorMessage: null },
    });
    if (!claimed.count) return;

    const stored = await this.prisma.asaasWebhookEvent.findUnique({ where: { id: eventId } });
    if (!stored) return;

    try {
      const payload = stored.payload as unknown as AsaasWebhookPayload;
      const event = payload.event || stored.eventType;
      if (payload.payment?.id) await this.handlePaymentEvent(event, payload.payment);
      if (payload.invoice?.id) await this.handleInvoiceEvent(event, payload.invoice);

      const recognized = Boolean(this.statusFromEvent(event) || REFUND_EVENTS.includes(event) || (event.startsWith('INVOICE_') && payload.invoice?.id));
      if (!recognized) {
        // PAG-07: evento sem tratamento: log estruturado + metrica, nenhuma mudanca de estado de fatura.
        this.logger.warn(`ASAAS_EVENT_UNHANDLED ${JSON.stringify({ event, paymentId: payload.payment?.id ?? null, invoiceId: payload.invoice?.id ?? null })}`);
        asaasUnhandledEvents.inc({ event: String(event).slice(0, 80) });
      }
      await this.prisma.asaasWebhookEvent.update({
        where: { id: eventId },
        data: {
          status: recognized ? 'PROCESSED' : 'IGNORED',
          processedAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (error) {
      webhookFailures.inc({ provider: 'asaas' });
      await this.prisma.asaasWebhookEvent.update({
        where: { id: eventId },
        data: { status: 'FAILED', errorMessage: String(error).slice(0, 2000) },
      }).catch(() => undefined);
      throw error;
    }
  }

  private async handlePaymentEvent(event: string, payment: AsaasWebhookPayment) {
    if (REFUND_EVENTS.includes(event)) {
      const invoice = await this.prisma.platformInvoice.findUnique({ where: { asaasPaymentId: payment.id } });
      if (!invoice) throw new Error('Devolução sem fatura vinculada: conciliação pendente.');
      if (!this.refunds) throw new Error('Serviço de devoluções indisponível.');
      await this.refunds.reconcile(invoice.id);
      return;
    }
    if (!this.statusFromEvent(event)) return;
    const company = await this.resolveCompany(payment);
    if (!company) {
      this.logger.warn(`Pagamento ${payment.id} sem empresa vinculada.`);
      return;
    }

    await this.syncProposal(company.id, event, payment);
    const existing = await this.prisma.platformInvoice.findUnique({ where: { asaasPaymentId: payment.id } })
      ?? (payment.externalReference?.startsWith('inv:') ? await this.prisma.platformInvoice.findUnique({ where: { id: payment.externalReference.slice(4) } }).catch(() => null) : null);
    // Cobrança da assinatura ainda não paga pode mudar de valor (desconto, cupom, usuários com updatePendingPayments): aceita o valor novo.
    const subscriptionRepriced = Boolean(existing && payment.subscription && existing.asaasPaymentId === payment.id && existing.status !== 'PAID');
    if (existing && (existing.companyId !== company.id || (Number(existing.amount) !== payment.value && !subscriptionRepriced) || (existing.asaasPaymentId && existing.asaasPaymentId !== payment.id))) throw new Error('Cobrança não corresponde à fatura reservada.');
    const status = this.resolveStatus(event, payment, existing);
    if (!status) {
      this.logger.warn(`Evento ${event} ignorado: ${existing ? `fatura ${existing.id}` : `cobrança ${payment.id}`} não muda de estado (fora de ordem ou removida).`);
      return;
    }
    // Evento fora de ordem: uma fatura já paga nunca volta para aberta/vencida (só estorno/cancelamento a altera).
    if (existing?.status === 'PAID' && (status === 'OPEN' || status === 'OVERDUE')) {
      this.logger.warn(`Evento ${event} ignorado: fatura ${existing.id} já está paga (fora de ordem).`);
      return;
    }
    // Paga, depois estornada/contestada: um "recebido" atrasado só reabre se o Asaas confirmar que está paga de novo.
    if (existing?.status === 'CANCELED' && existing.paidAt && status === 'PAID' && !(await this.remotelyPaid(payment.id))) {
      this.logger.warn(`Evento ${event} ignorado: fatura ${existing.id} foi estornada/contestada (fora de ordem).`);
      return;
    }
    const invoiceData = {
      companyId: company.id,
      description: payment.description || 'Cobrança Asaas',
      amount: payment.value,
      dueDate: payment.dueDate ? new Date(payment.dueDate) : new Date(),
      status,
      billingType: payment.billingType || 'PIX',
      invoiceUrl: payment.invoiceUrl,
      paidAt: status === 'PAID' ? existing?.paidAt ?? new Date() : existing?.paidAt,
      // Só PAYMENT_DELETED remove e só PAYMENT_RESTORED restaura; qualquer outro evento preserva o que já existe.
      deletedAt: event === 'PAYMENT_DELETED' ? new Date() : event === 'PAYMENT_RESTORED' ? null : existing?.deletedAt ?? null,
      // Taxa do gateway: o Asaas informa o liquido no proprio pagamento (so grava quando vier um numero valido).
      ...(status === 'PAID' && Number.isFinite(payment.netValue) && Number(payment.netValue) >= 0 ? { gatewayNetValue: payment.netValue } : {}),
    };

    const companyData: any = status === 'PAID'
      // Pagar uma fatura só reativa quando o bloqueio é por falta de pagamento e não resta outra fatura vencida.
      ? await companyDataAfterPayment(this.prisma, company.id, existing?.id)
      : status === 'OVERDUE'
        ? { billingStatus: 'PAST_DUE' }
        // Só suspende se a cobrança cancelada já estava paga (estorno). Cancelar uma cobrança em aberto (duplicada) não bloqueia a empresa.
        : status === 'CANCELED' && existing?.status === 'PAID'
          ? { billingStatus: 'PAST_DUE', status: 'SUSPENDED', isActive: false, suspensionReason: 'pagamento_cancelado_ou_estornado' }
          : {};

    const [invoice] = await this.prisma.$transaction([
      existing
        ? this.prisma.platformInvoice.update({ where: { id: existing.id }, data: { ...invoiceData, asaasPaymentId: payment.id, paymentProcessingStatus: 'LINK_READY' } })
        : this.prisma.platformInvoice.create({ data: { ...invoiceData, asaasPaymentId: payment.id, paymentProcessingStatus: 'LINK_READY' } }),
      ...(Object.keys(companyData).length ? [this.prisma.company.update({ where: { id: company.id }, data: companyData })] : []),
    ]);

    if (event === 'PAYMENT_CHARGEBACK_REQUESTED' && this.fiscal) await this.fiscal.handleRefund(invoice.id, 'CHARGEBACK');

    if (status === 'PAID' && existing?.status !== 'PAID') {
      await this.advanceCouponCycle(company.id);
      await cancelRedundantSignupCharges(this.prisma, this.asaas, this.logger, company.id, invoice.id).catch((error) => this.logger.warn(`Limpeza de cobrancas avulsas falhou: ${String(error)}`));
      // Nota fiscal: agenda no Asaas (não lança; se falhar, a rotina diária tenta de novo).
      if (this.fiscal) await this.fiscal.ensureForInvoice(invoice.id);
    }

    const type = PAYMENT_EVENT_MAP[event];
    if (type) {
      await this.notifications.notify({
        companyId: company.id,
        paymentId: invoice.id,
        type,
        amount: payment.value,
        dueDate: payment.dueDate ? new Date(payment.dueDate) : undefined,
        paidAt: status === 'PAID' ? new Date() : undefined,
        billingType: payment.billingType,
        paymentUrl: payment.invoiceUrl,
      });
    }
  }

  /** Conta um ciclo pago do cupom; quando acaba, remove o desconto e volta a assinatura do Asaas para o preço cheio. */
  private async advanceCouponCycle(companyId: string) {
    const subscription = await this.prisma.companySubscription.findUnique({ where: { companyId }, include: { plan: true, company: { select: { asaasSubscriptionId: true } } } });
    if (!subscription?.couponType || subscription.couponCyclesLeft === null || subscription.couponCyclesLeft <= 0) return;
    const left = subscription.couponCyclesLeft - 1;
    if (left > 0) {
      await this.prisma.companySubscription.update({ where: { companyId }, data: { couponCyclesLeft: left } });
      return;
    }
    const remoteId = subscription.asaasSubscriptionId || subscription.company.asaasSubscriptionId;
    try {
      if (remoteId && subscription.plan && this.asaas.isConfigured()) {
        const full = this.pricing.calculate((subscription.plan.commitmentMonths as 1 | 3 | 6 | 12) || 1, subscription.seatQuantity, planPricingForSubscription(subscription.plan, subscription));
        await this.asaas.updateSubscription(remoteId, { value: full.total });
      }
      await this.prisma.companySubscription.update({ where: { companyId }, data: { couponCyclesLeft: 0, couponType: null, couponValue: null } });
      this.logger.log('Cupom da empresa ' + companyId + ' acabou: assinatura voltou ao preco cheio.');
    } catch (error) {
      // Mantém o contador em 1 para tentar de novo no próximo pagamento.
      this.logger.error('Falha ao restaurar o preco cheio da empresa ' + companyId + ': ' + String(error));
    }
  }

  private async handleInvoiceEvent(event: string, invoice: AsaasWebhookInvoice) {
    if (!invoice.payment) return;
    const platformInvoice = await this.prisma.platformInvoice.findUnique({
      where: { asaasPaymentId: invoice.payment },
      select: { id: true, companyId: true, amount: true },
    });
    if (!platformInvoice) {
      this.logger.warn(`Nota fiscal ${invoice.id} sem cobrança vinculada.`);
      return;
    }

    if (this.fiscal) {
      await this.fiscal.persist(platformInvoice.id, invoice, event);
    } else {
      await this.prisma.platformInvoice.update({
        where: { id: platformInvoice.id },
        data: {
          asaasInvoiceId: invoice.id,
          invoiceNumber: invoice.number,
          invoiceSeries: invoice.series,
          invoiceValidationCode: invoice.validationCode,
          fiscalPdfUrl: invoice.pdfUrl,
          fiscalXmlUrl: invoice.xmlUrl,
          invoiceStatus: invoice.status,
          invoiceAuthorizedAt: event === 'INVOICE_AUTHORIZED' ? new Date() : undefined,
          invoiceCanceledAt: event === 'INVOICE_CANCELED' ? new Date() : undefined,
        },
      });
    }

    const type = INVOICE_EVENT_MAP[event];
    if (type) {
      await this.notifications.notify({
        companyId: platformInvoice.companyId,
        paymentId: invoice.payment,
        invoiceId: platformInvoice.id,
        type,
        amount: invoice.value ?? Number(platformInvoice.amount),
        invoiceNumber: invoice.number,
        fiscalPdfUrl: invoice.pdfUrl,
        fiscalXmlUrl: invoice.xmlUrl,
      });
    }
  }

  private async remotelyPaid(paymentId: string) {
    if (!this.asaas.isConfigured()) return false;
    const charge: any = await this.asaas.getCharge(paymentId);
    return ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(charge?.status);
  }

  /**
   * Estado da fatura após o evento. CREATED/UPDATED/RESTORED não dizem o estado pelo nome: valem o `payment.status` do payload
   * (PAYMENT_UPDATED = "alteração no vencimento ou valor"). Devolve undefined quando o evento não deve mudar nada.
   */
  private resolveStatus(event: string, payment: AsaasWebhookPayment, existing: { status: string; dueDate?: Date | null; deletedAt?: Date | null } | null): InvoiceStatus | undefined {
    if (!['PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_RESTORED'].includes(event)) return this.statusFromEvent(event);
    const remote = payment.status;
    let derived: InvoiceStatus | undefined;
    if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(remote ?? '')) derived = 'PAID';
    else if (remote === 'OVERDUE') derived = 'OVERDUE';
    else if (remote === 'DELETED') derived = 'CANCELED';
    else if (remote === undefined || remote === null || remote === '') derived = existing ? undefined : 'OPEN';
    else if (/REFUND|CHARGEBACK/.test(remote)) derived = undefined; // estornos têm eventos próprios
    else derived = 'OPEN'; // PENDING, AWAITING_RISK_ANALYSIS, ...
    if (!existing) return derived;
    if (derived === undefined) return undefined;
    const removed = existing.status === 'CANCELED' || Boolean(existing.deletedAt);
    if (derived === 'OPEN' || derived === 'OVERDUE') {
      if (removed && event !== 'PAYMENT_RESTORED') return undefined;
      // Vencida só reabre com prorrogação real: PENDING e novo vencimento a partir de hoje.
      if (existing.status === 'OVERDUE' && derived === 'OPEN') {
        const due = payment.dueDate ? new Date(payment.dueDate) : null;
        return due && due.getTime() >= saoPauloToday().getTime() ? 'OPEN' : undefined;
      }
    }
    return derived;
  }

  private statusFromEvent(event: string): InvoiceStatus | undefined {
    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED_IN_CASH'].includes(event)) return 'PAID';
    if (event === 'PAYMENT_OVERDUE') return 'OVERDUE';
    if (['PAYMENT_DELETED', 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE'].includes(event)) return 'CANCELED';
    if (['PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_RESTORED'].includes(event)) return 'OPEN';
    return undefined;
  }

  private async resolveCompany(payment: AsaasWebhookPayment) {
    const existing = await this.prisma.platformInvoice.findUnique({
      where: { asaasPaymentId: payment.id },
      select: { company: { select: { id: true } } },
    });
    if (existing) return existing.company;
    if (payment.customer) {
      const company = await this.prisma.company.findFirst({
        where: { asaasCustomerId: payment.customer },
        select: { id: true },
      });
      if (company) return company;
    }
    if (payment.externalReference?.startsWith('inv:')) {
      const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: payment.externalReference.slice(4) }, select: { company: { select: { id: true } } } }).catch(() => null);
      return invoice?.company ?? null;
    }
    if (payment.externalReference) {
      const companyId = payment.externalReference.startsWith('signup:')
        ? payment.externalReference.slice('signup:'.length)
        : payment.externalReference;
      return this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true } }).catch(() => null);
    }
    return null;
  }

  private async syncProposal(companyId: string, event: string, payment: AsaasWebhookPayment) {
    if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event)) return;
    const proposal = await this.prisma.proposal.findFirst({
      where: { companyId, asaasInvoiceId: payment.subscription || payment.id },
    });
    if (!proposal || proposal.status === 'PAID') return;
    await this.prisma.$transaction([
      this.prisma.proposal.update({
        where: { id: proposal.id },
        data: { status: 'PAID', paymentStatus: 'PAID', paidAt: new Date() },
      }),
      this.prisma.proposalAuditLog.create({
        data: {
          proposalId: proposal.id,
          action: 'PAYMENT_RECEIVED',
          actor: 'SYSTEM',
          metadata: JSON.stringify({ asaasPaymentId: payment.id, event }),
        },
      }),
    ]);
  }
}

@Processor('asaas-webhook')
export class AsaasWebhookWorker {
  constructor(private readonly processor: AsaasWebhookProcessorService) {}

  @Process('process')
  process(job: Job<{ eventId: string }>) {
    return this.processor.processStoredEvent(job.data.eventId);
  }
}
