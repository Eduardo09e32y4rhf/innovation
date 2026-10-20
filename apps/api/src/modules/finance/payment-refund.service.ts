import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { AsaasRejectedException, AsaasService } from './asaas.service';
import { MercadoPagoService } from './mercadopago.service';
import { AsaasFiscalService } from './asaas-fiscal.service';

const cents = (value: unknown) => Math.round(Number(value) * 100);
const active = ['PROCESSING', 'PENDING', 'UNKNOWN'];

/** Reserva o saldo antes da chamada externa; nunca repete POST de resultado desconhecido. */
@Injectable()
export class PaymentRefundService {
  private readonly logger = new Logger(PaymentRefundService.name);
  constructor(private readonly prisma: PrismaService, private readonly asaas: AsaasService, private readonly mp: MercadoPagoService, @Optional() private readonly fiscal?: AsaasFiscalService) {}

  async request(invoiceId: string, input: { amount?: number; reason: string; key?: string; actorId?: string }) {
    const key = `${invoiceId}:${input.key || `legacy:${input.amount ?? 'remaining'}`}`;
    const reservation = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "PlatformInvoice" WHERE "id" = ${invoiceId}::uuid FOR UPDATE`;
      const invoice = await tx.platformInvoice.findFirst({ where: { id: invoiceId, deletedAt: null } });
      if (!invoice) throw new NotFoundException('Fatura não encontrada.');
      const existing = await tx.paymentRefund.findUnique({ where: { requestKey: key } });
      if (existing) {
        if (existing.kind !== (input.amount === undefined ? 'FULL' : 'PARTIAL') || (input.amount !== undefined && cents(existing.amount) !== cents(input.amount)) || existing.reason !== input.reason) throw new ConflictException('A chave já foi usada com outros dados.');
        return { operation: existing, invoice, created: false };
      }
      if (invoice.status !== 'PAID') throw new BadRequestException('A fatura precisa estar paga para solicitar devolução.');
      const provider = invoice.provider === 'MERCADOPAGO' ? 'MERCADOPAGO' : 'ASAAS';
      if (provider === 'MERCADOPAGO' ? !invoice.mpPaymentId || !this.mp.isConfigured() : !invoice.asaasPaymentId || !this.asaas.isConfigured()) throw new BadRequestException('Pagamento sem provedor configurado. Nenhuma devolução foi enviada.');
      const operations = await tx.paymentRefund.findMany({ where: { invoiceId } });
      if (operations.some(op => active.includes(op.status))) throw new ConflictException('Há uma devolução em processamento. Sincronize antes de solicitar outra.');
      const legacy = await tx.invoiceAdjustment.aggregate({ where: { invoiceId, type: 'PARTIAL_REFUND' }, _sum: { amount: true } });
      const confirmed = operations.filter(op => op.status === 'CONFIRMED').reduce((sum, op) => sum + cents(op.amount), 0);
      const available = cents(invoice.amount) - Math.max(cents(invoice.refundedAmount), cents(legacy._sum.amount ?? 0) + confirmed);
      const amount = input.amount === undefined ? available : cents(input.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > available || (input.amount !== undefined && Math.abs(input.amount * 100 - amount) > 0.000001)) throw new BadRequestException(`Valor indisponível. Saldo para devolução: R$ ${(Math.max(0, available) / 100).toFixed(2)}.`);
      const operation = await tx.paymentRefund.create({ data: { invoiceId, requestKey: key, kind: input.amount === undefined ? 'FULL' : 'PARTIAL', amount: amount / 100, provider, reason: input.reason, actorId: input.actorId } });
      await tx.platformInvoice.update({ where: { id: invoiceId }, data: { refundStatus: 'PROCESSING' } });
      await tx.auditLog.create({ data: { companyId: invoice.companyId, userId: input.actorId, action: 'REFUND_REQUESTED', entity: 'PaymentRefund', entityId: operation.id, metadata: { invoiceId, amount: amount / 100, reason: input.reason } } });
      return { operation, invoice, created: true };
    });
    if (!reservation.created) return reservation.operation;
    const { operation, invoice } = reservation;
    try {
      if (operation.provider === 'MERCADOPAGO') {
        const result = await this.mp.refund(invoice.mpPaymentId!, Number(operation.amount), operation.id);
        await this.prisma.paymentRefund.update({ where: { id: operation.id }, data: { providerRefundId: String(result.id), status: 'PENDING' } });
      } else {
        await this.asaas.refundPayment(invoice.asaasPaymentId!, Number(operation.amount), `${input.reason} [Innovation:${operation.id}]`);
        await this.prisma.paymentRefund.update({ where: { id: operation.id }, data: { status: 'PENDING' } });
      }
      await this.reconcile(invoiceId);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      // Recusa definitiva (Asaas 400/404/422 com motivo; Mercado Pago 404): o provedor NÃO aceitou, então a reserva é liberada na hora.
      if (error instanceof AsaasRejectedException || error instanceof NotFoundException) {
        await this.failReservation(invoiceId, operation.id, detail);
        return this.prisma.paymentRefund.findUniqueOrThrow({ where: { id: operation.id } });
      }
      // Timeout, 5xx e falha de persistência também podem ocorrer após o provedor aceitar. Não liberar reserva nem repetir:
      // fica UNKNOWN (devolução pendente) e a conciliação a cada 5 min decide. Guarda o motivo real para a tela e o log.
      await this.prisma.paymentRefund.updateMany({ where: { id: operation.id, status: { in: active } }, data: { status: 'UNKNOWN', errorMessage: detail.slice(0, 500) } }).catch(() => undefined);
      this.logger.warn(`Devolução ${operation.id} precisa de conciliação: ${detail}`);
    }
    return this.prisma.paymentRefund.findUniqueOrThrow({ where: { id: operation.id } });
  }

  /** Recusa definitiva do provedor: marca FALHOU, audita e devolve o saldo reservado (a fatura volta ao estado anterior). */
  private async failReservation(invoiceId: string, operationId: string, detail: string) {
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "PlatformInvoice" WHERE "id" = ${invoiceId}::uuid FOR UPDATE`;
      const op = await tx.paymentRefund.update({ where: { id: operationId }, data: { status: 'FAILED', errorMessage: detail.slice(0, 500) } });
      const invoice = await tx.platformInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
      const pending = await tx.paymentRefund.count({ where: { invoiceId, status: { in: active } } });
      const refunded = cents(invoice.refundedAmount);
      const status = pending ? 'PROCESSING' : refunded >= cents(invoice.amount) ? 'REFUNDED' : refunded > 0 ? 'PARTIALLY_REFUNDED' : null;
      await tx.platformInvoice.update({ where: { id: invoiceId }, data: { refundStatus: status } });
      await tx.auditLog.create({ data: { companyId: invoice.companyId, userId: op.actorId, action: 'REFUND_FAILED', entity: 'PaymentRefund', entityId: op.id, metadata: { invoiceId, amount: Number(op.amount), reason: 'recusado_pelo_provedor', detail: detail.slice(0, 200) } } });
    });
    this.logger.warn(`Devolução ${operationId} recusada pelo provedor: ${detail}`);
  }

  async reconcile(invoiceId: string) {
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Fatura não encontrada.');
    const provider = invoice.provider === 'MERCADOPAGO' ? 'MERCADOPAGO' : 'ASAAS';
    const remote: any[] = provider === 'MERCADOPAGO'
      ? await this.mp.getRefunds(invoice.mpPaymentId!)
      : await this.asaasRefunds(invoice.asaasPaymentId!);
    const done = (status: string) => provider === 'MERCADOPAGO' ? status === 'approved' : status === 'DONE';
    const total = remote.filter(r => done(r.status)).reduce((sum, r) => sum + cents('value' in r ? r.value : r.amount), 0);
    if (total > cents(invoice.amount)) throw new ConflictException('O total devolvido pelo provedor excede a fatura. Revisão necessária.');
    const result = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "PlatformInvoice" WHERE "id" = ${invoiceId}::uuid FOR UPDATE`;
      const locked = await tx.platformInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
      const confirmedTotal = Math.max(total, cents(locked.refundedAmount));
      const operations = await tx.paymentRefund.findMany({ where: { invoiceId, status: { in: active } } });
      const tagged = new Set(remote.filter(r => typeof r.description === 'string' && r.description.includes('[Innovation:')));
      for (const op of operations) {
        let match = remote.find(r => provider === 'MERCADOPAGO' ? String(r.id) === op.providerRefundId : r.description?.includes(`[Innovation:${op.id}]`));
        // O Asaas nem sempre devolve a descrição do estorno: com uma única devolução pendente, casa pelo valor.
        if (!match && provider === 'ASAAS' && operations.length === 1) {
          const candidates = remote.filter(r => !tagged.has(r) && cents(r.value) === cents(op.amount));
          if (candidates.length === 1) match = candidates[0];
        }
        if (!match) {
          // O pedido deu erro e o Asaas/MP não tem nenhum estorno com esse valor 10 min depois: nunca chegou lá.
          // Marca como falha (com o motivo) para liberar um novo pedido, em vez de ficar "aguardando" para sempre.
          const stale = Date.now() - new Date(op.createdAt).getTime() > 10 * 60_000;
          const sameValue = remote.some(r => cents('value' in r ? r.value : r.amount) === cents(op.amount));
          if (op.status === 'UNKNOWN' && stale && !sameValue) {
            await tx.paymentRefund.update({ where: { id: op.id }, data: { status: 'FAILED', errorMessage: op.errorMessage && !op.errorMessage.startsWith('Confirmação pendente') ? op.errorMessage : 'O provedor não registrou esta devolução. Nada foi devolvido; solicite de novo.' } });
            await tx.auditLog.create({ data: { companyId: invoice.companyId, userId: op.actorId, action: 'REFUND_FAILED', entity: 'PaymentRefund', entityId: op.id, metadata: { invoiceId, amount: Number(op.amount), reason: 'nao_encontrada_no_provedor' } } });
          } else if (op.status === 'UNKNOWN' && Date.now() - new Date(op.createdAt).getTime() > 24 * 60 * 60_000) {
            // Há estorno de mesmo valor no provedor que não casa com este pedido: não dá para decidir sozinho. Alerta uma vez.
            const flagged = await tx.auditLog.findFirst({ where: { action: 'REFUND_NEEDS_REVIEW', entityId: op.id }, select: { id: true } });
            if (!flagged) {
              await tx.auditLog.create({ data: { companyId: invoice.companyId, userId: op.actorId, action: 'REFUND_NEEDS_REVIEW', entity: 'PaymentRefund', entityId: op.id, metadata: { invoiceId, amount: Number(op.amount) } } });
              this.logger.error(`ALERTA: devolução ${op.id} há mais de 24h sem conciliar com o provedor; revisão manual.`);
            }
          }
          continue;
        }
        if (cents('value' in match ? match.value : match.amount) !== cents(op.amount)) throw new ConflictException('Valor da devolução não confere com a solicitação.');
        const confirmed = done(match.status);
        const failed = ['CANCELLED', 'cancelled', 'rejected'].includes(match.status);
        if (!confirmed && !failed) continue;
        await tx.paymentRefund.update({ where: { id: op.id }, data: { status: confirmed ? 'CONFIRMED' : 'FAILED', confirmedAt: confirmed ? new Date() : null, errorMessage: failed ? 'Devolução recusada ou cancelada pelo provedor.' : null, receiptUrl: 'transactionReceiptUrl' in match ? match.transactionReceiptUrl : null } });
        await tx.auditLog.create({ data: { companyId: invoice.companyId, userId: op.actorId, action: confirmed ? 'REFUND_CONFIRMED' : 'REFUND_FAILED', entity: 'PaymentRefund', entityId: op.id, metadata: { invoiceId, amount: Number(op.amount), reason: op.reason } } });
      }
      const pending = await tx.paymentRefund.count({ where: { invoiceId, status: { in: active } } });
      const status = pending ? 'PROCESSING' : confirmedTotal >= cents(invoice.amount) ? 'REFUNDED' : confirmedTotal > 0 ? 'PARTIALLY_REFUNDED' : null;
      await tx.platformInvoice.update({ where: { id: invoiceId }, data: { refundedAmount: confirmedTotal / 100, refundStatus: status } });
      return { refundedAmount: confirmedTotal / 100, refundStatus: status };
    });
    if (this.fiscal) await this.fiscal.handleRefund(invoiceId, result.refundStatus);
    return result;
  }

  private async asaasRefunds(paymentId: string) {
    try {
      const list = await this.asaas.listRefunds(paymentId);
      if (Array.isArray(list?.data) && list.data.length) return list.data;
    } catch (error) { this.logger.warn(`Lista de estornos do Asaas indisponível (${paymentId}): ${String(error)}`); }
    return (await this.asaas.getCharge(paymentId)).refunds ?? [];
  }

  @Cron('0 */5 * * * *')
  async reconcilePending() {
    const pending = await this.prisma.paymentRefund.findMany({ where: { status: { in: active } }, select: { invoiceId: true }, distinct: ['invoiceId'], orderBy: { updatedAt: 'asc' }, take: 40 });
    for (const { invoiceId } of pending) {
      try { await this.reconcile(invoiceId); } catch { this.logger.warn(`Conciliação pendente da fatura ${invoiceId}.`); }
    }
  }
}
