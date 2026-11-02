import { Body, Controller, ForbiddenException, Headers, HttpCode, Logger, NotFoundException, Post, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../database/prisma.service';
import { FinanceNotificationService } from './finance-notification.service';
import { MercadoPagoService } from './mercadopago.service';
import { PaymentRefundService } from './payment-refund.service';
import { MercadoPagoPaymentSyncService } from './mercadopago-payment-sync.service';

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
    sync?: MercadoPagoPaymentSyncService,
  ) {
    this.sync = sync ?? new MercadoPagoPaymentSyncService(prisma, mercadoPago, notifications, refunds);
  }

  private readonly sync: MercadoPagoPaymentSyncService;

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

    return this.sync.apply(invoice, payment);
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
      // Sem segredo nunca confiamos no webhook; bypass só em dev com flag explícita.
      if (process.env.NODE_ENV !== 'production' && process.env.MERCADOPAGO_WEBHOOK_INSECURE === 'true') {
        this.logger.warn('MERCADOPAGO_WEBHOOK_INSECURE=true: assinatura NÃO validada (somente desenvolvimento).');
        return;
      }
      this.logger.warn('MERCADOPAGO_WEBHOOK_SECRET não configurado: webhook rejeitado.');
      throw new ForbiddenException('Webhook não configurado.');
    }
    if (!this.mercadoPago.verifySignature(input)) throw new ForbiddenException('Assinatura de webhook inválida.');
  }
}
