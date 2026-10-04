import { Body, Controller, ForbiddenException, Headers, HttpCode, Logger, Post, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../database/prisma.service';
import { FinanceNotificationService } from './finance-notification.service';
import { MercadoPagoService } from './mercadopago.service';

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
    const type = body?.type || body?.topic || queryType;
    const dataId = String(queryDataId ?? body?.data?.id ?? '');

    this.assertAuthentic({ signature, requestId, dataId });
    if (type !== 'payment' || !dataId) return { received: true, ignored: true };
    if (!this.mercadoPago.isConfigured()) {
      this.logger.warn('Webhook do Mercado Pago recebido, mas MERCADOPAGO_ACCESS_TOKEN não está configurado.');
      return { received: true, ignored: true };
    }

    const payment = await this.mercadoPago.getPayment(dataId);
    const invoice = await this.findInvoice(String(payment.id), payment.external_reference);
    if (!invoice) {
      this.logger.warn(`Pagamento ${payment.id} do Mercado Pago sem fatura vinculada (ref=${payment.external_reference ?? '-'}).`);
      return { received: true, ignored: true };
    }

    const status = this.mercadoPago.mapStatus(payment.status);
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
