import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FinanceNotificationService } from './finance-notification.service';
import type { MercadoPagoPayment } from './mercadopago.service';
import { MercadoPagoService } from './mercadopago.service';
import { PaymentRefundService } from './payment-refund.service';
import { companyDataAfterPayment } from './payment-access';

export interface MercadoPagoSyncInvoice { id: string; companyId: string; status: string; paidAt: Date | null; billingType: string }
export type MercadoPagoSyncResult = { received: true; duplicate?: true; ignored?: true; refunded?: true; status?: 'PAID' | 'OPEN' | 'CANCELED' };

/**
 * Aplica o estado REAL de um pagamento do Mercado Pago (ja reconsultado na API) a fatura e a empresa.
 * Compartilhado pelo webhook e pela conciliacao periodica, para que os dois sigam exatamente as mesmas regras.
 */
@Injectable()
export class MercadoPagoPaymentSyncService {
  private readonly logger = new Logger(MercadoPagoPaymentSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoService,
    private readonly notifications: FinanceNotificationService,
    @Optional() private readonly refunds?: PaymentRefundService,
  ) {}

  async apply(invoice: MercadoPagoSyncInvoice, payment: MercadoPagoPayment): Promise<MercadoPagoSyncResult> {
    const status = this.mercadoPago.mapStatus(payment.status);
    if (payment.status === 'refunded' || Number(payment.transaction_amount_refunded ?? 0) > 0) {
      if (!this.refunds) throw new Error('Serviço de devoluções indisponível.');
      await this.refunds.reconcile(invoice.id);
      if (payment.status === 'refunded') return { received: true, refunded: true };
    }
    if (invoice.status === 'PAID' && status === 'PAID') return { received: true, duplicate: true };
    if (invoice.status === 'PAID' && status === 'OPEN') return { received: true, ignored: true }; // evento antigo chegando depois

    const paidAt = status === 'PAID' ? invoice.paidAt ?? (payment.date_approved ? new Date(payment.date_approved) : new Date()) : invoice.paidAt;
    // Pagamento só reativa quando o bloqueio é por falta de pagamento e não resta outra fatura vencida.
    const companyData = status === 'PAID'
      ? await companyDataAfterPayment(this.prisma, invoice.companyId, invoice.id)
      : status === 'CANCELED'
        ? { billingStatus: 'PAST_DUE' as const, status: 'SUSPENDED' as const, isActive: false, suspensionReason: 'pagamento_cancelado_ou_estornado' }
        : null;
    const data = { status, paidAt, provider: 'MERCADOPAGO' as const, mpPaymentId: String(payment.id), billingType: payment.payment_type_id === 'bank_transfer' ? 'PIX' : payment.payment_type_id === 'credit_card' ? 'CREDIT_CARD' : invoice.billingType };

    // Transição atômica: só quem muda a fatura de "não paga" para PAID conta o cupom e notifica (duas entregas simultâneas).
    const won = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.platformInvoice.updateMany({ where: { id: invoice.id, status: { not: status === 'CANCELED' ? 'CANCELED' : 'PAID' } }, data });
      if (claim.count !== 1) return false;
      if (companyData && Object.keys(companyData).length) await tx.company.update({ where: { id: invoice.companyId }, data: companyData });
      await tx.auditLog.create({
        data: { companyId: invoice.companyId, action: `MERCADOPAGO_PAYMENT_${status}`, entity: 'Billing', entityId: invoice.id, metadata: { paymentId: String(payment.id), mpStatus: payment.status, actorEmail: 'system' } },
      });
      return true;
    });
    if (!won) return { received: true, duplicate: true };

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
}
