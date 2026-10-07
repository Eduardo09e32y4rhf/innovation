import { Body, Controller, ForbiddenException, Headers, HttpCode, Logger, NotFoundException, Post, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../database/prisma.service';
import { FinanceNotificationService } from './finance-notification.service';
import { MercadoPagoService } from './mercadopago.service';
import { PaymentRefundService } from './payment-refund.service';

interface MercadoPagoNotification {
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: string | number };
}

/**
 * Webhook do Mercado Pago. Nunca confia no corpo: valida a assinatura e RECONSULTA o pagamento na API
 * antes de alterar fatura ou empresa. Idempotente (repetições e ordem trocada não causam efeito duplicado).
 */
@SkipThrottle()
@Controller('finance/webhook')
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoService,
    private readonly notifications: FinanceNotificationService,
    private readonly refunds?: PaymentRefundService,
  ) {}

  @Post('mercadopago')
  @HttpCode(200)
  async handle(
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('data.id') queryDataId: string | undefined,
    @Query('type') queryType: string | undefined,
    @Body() body: MercadoPagoNotification,
  ) {
    try {
      return await this.process(signature, requestId, queryDataId, queryType, body);
    } catch (error) {
      // Id inexistente no Mercado Pago (ex.: "Simular notificação" do painel): confirma o recebimento, sem nova tentativa.
      if (error instanceof NotFoundException) return { received: true, ignored: true, reason: 'nao_encontrado' };
      throw error;
    }
  }

  private async process(signature: string | undefined, requestId: string | undefined, queryDataId: string | undefined, queryType: string | undefined, body: MercadoPagoNotification) {
    const type = body?.type || body?.topic || queryType;
    const dataId = String(queryDataId ?? body?.data?.id ?? '');

    this.assertAuthentic({ signature, requestId, dataId });
    const isSubscriptionPayment = type === 'subscription_authorized_payment';
    if (type === 'subscription_preapproval' && dataId && this.mercadoPago.isConfigured()) return this.handlePreapproval(dataId);
    if ((type !== 'payment' && !isSubscriptionPayment) || !dataId) return { received: true, ignored: true };
    if (!this.mercadoPago.isConfigured()) {
      this.logger.warn('Webhook do Mercado Pago recebido, mas MERCADOPAGO_ACCESS_TOKEN não está configurado.');
      return { received: true, ignored: true };
    }

    let paymentId = dataId;
    let preapprovalId: string | undefined;
    if (isSubscriptionPayment) {
      // Cobrança recorrente: o aviso traz o id da cobrança autorizada; o pagamento real vem dentro dela.
      const authorized = await this.mercadoPago.getAuthorizedPayment(dataId);
      preapprovalId = authorized.preapproval_id;
      if (!authorized.payment?.id) return { received: true, ignored: true, reason: 'sem_pagamento_ainda' };
      paymentId = String(authorized.payment.id);
    }

    const payment = await this.mercadoPago.getPayment(paymentId);
    const invoice = (await this.findInvoice(String(payment.id), payment.external_reference))
      ?? (isSubscriptionPayment ? await this.invoiceForSubscriptionCharge(preapprovalId, payment) : null);
    if (!invoice) {
      this.logger.warn(`Pagamento ${payment.id} do Mercado Pago sem fatura vinculada (ref=${payment.external_reference ?? '-'}).`);
      return { received: true, ignored: true };
    }

    const status = this.mercadoPago.mapStatus(payment.status);
    if (payment.status === 'refunded' || Number(payment.transaction_amount_refunded ?? 0) > 0) {
      if (!this.refunds) throw new Error('Serviço de devoluções indisponível.');
      await this.refunds.reconcile(invoice.id);
      if (payment.status === 'refunded') return { received: true, refunded: true };
    }
    if (invoice.status === 'PAID' && status === 'PAID') return { received: true, duplicate: true };
    if (invoice.status === 'PAID' && status === 'OPEN') return { received: true, ignored: true }; // evento antigo chegando depois

    const paidAt = status === 'PAID' ? invoice.paidAt ?? (payment.date_approved ? new Date(payment.date_approved) : new Date()) : invoice.paidAt;
    const companyData = status === 'PAID'
      ? { billingStatus: 'ACTIVE' as const, status: 'ACTIVE' as const, isActive: true, suspensionReason: null }
      : status === 'CANCELED'
        ? { billingStatus: 'PAST_DUE' as const, status: 'SUSPENDED' as const, isActive: false, suspensionReason: 'pagamento_cancelado_ou_estornado' }
        : null;

    await this.prisma.$transaction([
      this.prisma.platformInvoice.update({
        where: { id: invoice.id },
        data: { status, paidAt, provider: 'MERCADOPAGO', mpPaymentId: String(payment.id), billingType: payment.payment_type_id === 'bank_transfer' ? 'PIX' : payment.payment_type_id === 'credit_card' ? 'CREDIT_CARD' : invoice.billingType },
      }),
      ...(companyData ? [this.prisma.company.update({ where: { id: invoice.companyId }, data: companyData })] : []),
      this.prisma.auditLog.create({
        data: { companyId: invoice.companyId, action: `MERCADOPAGO_PAYMENT_${status}`, entity: 'Billing', entityId: invoice.id, metadata: { paymentId: String(payment.id), mpStatus: payment.status, actorEmail: 'system' } },
      }),
    ]);

    if (status === 'PAID') {
      // Conta um ciclo pago do cupom; sem assinatura recorrente no MP, o preço cheio volta na próxima fatura.
      await this.prisma.companySubscription.updateMany({ where: { companyId: invoice.companyId, couponCyclesLeft: { gt: 0 } }, data: { couponCyclesLeft: { decrement: 1 } } }).catch(() => undefined);
      await this.prisma.companySubscription.updateMany({ where: { companyId: invoice.companyId, couponCyclesLeft: 0, couponType: { not: null } }, data: { couponType: null, couponValue: null } }).catch(() => undefined);
      await this.notifications.notify({
        companyId: invoice.companyId, paymentId: invoice.id, type: 'PAYMENT_CONFIRMED', amount: Number(payment.transaction_amount), paidAt: new Date(), billingType: payment.payment_type_id,
      }).catch((error) => this.logger.warn(`Notificação de pagamento falhou: ${String(error)}`));
    }
    return { received: true, status };
  }

  /** Fatura aberta da assinatura (a do checkout inicial) ou uma nova para a cobrança mensal que acabou de chegar. */
  private async invoiceForSubscriptionCharge(preapprovalId: string | undefined, payment: { id: number | string; transaction_amount: number; external_reference?: string | null }) {
    const sub = preapprovalId
      ? await this.prisma.companySubscription.findUnique({ where: { mpPreapprovalId: preapprovalId }, select: { companyId: true } })
      : null;
    const companyId = sub?.companyId ?? /^sub:([0-9a-f-]{36})$/i.exec(payment.external_reference ?? '')?.[1];
    if (!companyId) return null;
    const open = await this.prisma.platformInvoice.findFirst({
      where: { companyId, provider: 'MERCADOPAGO', deletedAt: null, status: { in: ['OPEN', 'OVERDUE'] }, mpPaymentId: null },
      orderBy: { createdAt: 'asc' },
    });
    if (open) return open;
    return this.prisma.platformInvoice.create({
      data: { companyId, description: 'Mensalidade Innovation RH', amount: payment.transaction_amount, dueDate: new Date(), status: 'OPEN', billingType: 'CREDIT_CARD', provider: 'MERCADOPAGO' },
    });
  }

  /** Mudanças de estado da assinatura ficam no registro de auditoria; bloqueio/reativação seguem a régua de inadimplência. */
  private async handlePreapproval(id: string) {
    const preapproval = await this.mercadoPago.getPreapproval(id);
    const sub = await this.prisma.companySubscription.findUnique({ where: { mpPreapprovalId: id }, select: { companyId: true } });
    if (!sub) return { received: true, ignored: true };
    await this.prisma.auditLog.create({
      data: { companyId: sub.companyId, action: `MERCADOPAGO_SUBSCRIPTION_${String(preapproval.status).toUpperCase()}`, entity: 'Subscription', entityId: id, metadata: { actorEmail: 'system' } },
    });
    return { received: true, subscription: preapproval.status };
  }

  private async findInvoice(paymentId: string, externalReference?: string | null) {
    const byPayment = await this.prisma.platformInvoice.findUnique({ where: { mpPaymentId: paymentId } });
    if (byPayment) return byPayment;
    const match = /^inv:([0-9a-f-]{36})$/i.exec(externalReference ?? '');
    return match ? this.prisma.platformInvoice.findFirst({ where: { id: match[1], deletedAt: null } }) : null;
  }

  private assertAuthentic(input: { signature?: string; requestId?: string; dataId?: string }) {
    if (!this.mercadoPago.hasWebhookSecret()) {
      this.logger.warn('MERCADOPAGO_WEBHOOK_SECRET não configurado.');
      if (process.env.NODE_ENV === 'production') throw new ForbiddenException('Webhook não configurado.');
      return;
    }
    if (!this.mercadoPago.verifySignature(input)) throw new ForbiddenException('Assinatura de webhook inválida.');
  }
}
