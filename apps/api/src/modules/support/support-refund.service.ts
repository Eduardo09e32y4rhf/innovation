import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { PaymentRefundService, PaymentRefundSettled } from '../finance/payment-refund.service';
import { SupportRepository } from './support.repository';
import { SupportSlaService } from './support-sla.service';
import { SupportNotificationService } from './support-notification.service';
import { applyRefundPolicy, refundDualApprovalAbove, toCents } from './support-refund.policy';
import type { CreateRefundRequestDto } from './dto/support-refund.dto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE_OPS = ['PROCESSING', 'PENDING', 'UNKNOWN'];
const brl = (v: unknown) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

@Injectable()
export class SupportRefundService implements OnModuleInit {
  private readonly logger = new Logger(SupportRefundService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: SupportRepository,
    private readonly sla: SupportSlaService,
    private readonly moduleRef: ModuleRef,
    private readonly notifier: SupportNotificationService,
  ) {}

  /** Resolvido sob demanda: FinanceModule -> Queue -> Privacy -> Support forma ciclo de módulos se importado direto. */
  private get paymentRefund(): PaymentRefundService {
    return this.moduleRef.get(PaymentRefundService, { strict: false });
  }

  /** Recebe do financeiro o resultado do estorno (confirmado/falho) e atualiza o chamado. */
  onModuleInit() {
    PaymentRefundService.onSettled(event => this.handleSettled(event));
  }

  private event(ticketId: string, actorUserId: string | null, eventType: string, newValue?: object, metadata?: object) {
    return this.prisma.supportTicketEvent.create({ data: { ticketId, actorUserId: actorUserId ?? undefined, eventType, newValue: newValue as any, metadata: metadata as any } });
  }

  async createRequest(actor: JwtUser, dto: CreateRefundRequestDto) {
    if (actor.role !== 'ADMIN' && actor.role !== 'DEV') throw new ForbiddenException('Somente o administrador da empresa pode solicitar reembolso.');
    const invoice = await this.prisma.platformInvoice.findFirst({
      where: { id: dto.invoiceId, companyId: actor.companyId, deletedAt: null },
      include: { plan: { select: { cycle: true } } },
    });
    if (!invoice) throw new NotFoundException('Fatura não encontrada.');
    if (invoice.status !== 'PAID') throw new BadRequestException('Só é possível solicitar reembolso de fatura paga.');

    const [ops, pending] = await Promise.all([
      this.prisma.paymentRefund.findMany({ where: { invoiceId: invoice.id, status: { in: ACTIVE_OPS } }, select: { amount: true } }),
      this.prisma.supportTicket.findMany({
        where: { invoiceId: invoice.id, category: 'REFUND', OR: [{ refundStatus: { in: ['REQUESTED', 'AWAITING_SECOND_APPROVAL', 'APPROVED'] } }, { refundStatus: 'PROCESSING', paymentRefundId: null }] },
        select: { refundAmount: true },
      }),
    ]);
    const sum = (rows: Array<{ amount?: unknown; refundAmount?: unknown }>) => rows.reduce((t, r) => t + toCents(r.amount ?? r.refundAmount ?? 0), 0);
    const availableCents = toCents(invoice.amount) - toCents(invoice.refundedAmount) - sum(ops) - sum(pending);
    const amount = applyRefundPolicy({
      kind: dto.kind, amount: dto.amount, paid: Number(invoice.amount), available: Math.max(0, availableCents) / 100,
      paidAt: invoice.paidAt ?? invoice.dueDate, cycle: invoice.plan?.cycle,
    });

    const priority = 'NORMAL' as const;
    const ticketNumber = await this.repository.generateTicketNumber();
    const ticket = await this.repository.createTicket({
      ticketNumber, companyId: actor.companyId, createdByUserId: actor.sub, requesterName: actor.name, requesterEmail: actor.email,
      source: 'AUTHENTICATED', category: 'REFUND', priority,
      title: `Reembolso ${dto.kind === 'TOTAL' ? 'total' : 'parcial'} da fatura ${invoice.description ?? invoice.id.slice(0, 8)}`,
      description: dto.reason, ...this.sla.calculateDueDates(priority),
      invoiceId: invoice.id, refundKind: dto.kind, refundAmount: amount, refundStatus: 'REQUESTED', refundReason: dto.reason,
    });
    await this.event(ticket.id, actor.sub, 'TICKET_CREATED', undefined, { source: 'WEB_APP', category: 'REFUND' });
    await this.event(ticket.id, actor.sub, 'REFUND_REQUESTED', { status: 'REQUESTED', kind: dto.kind, amount, invoiceId: invoice.id }, { reason: dto.reason });
    return { ...ticket, refundAmount: amount };
  }

  private async loadRefundTicket(actor: JwtUser, id: string) {
    if (actor.role !== 'DEV' && actor.role !== 'CEO') throw new ForbiddenException('Seu perfil não pode decidir reembolsos.');
    if (!UUID.test(id)) throw new NotFoundException('Chamado não encontrado.');
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket || ticket.category !== 'REFUND' || !ticket.refundStatus) throw new NotFoundException('Pedido de reembolso não encontrado.');
    if (ticket.createdByUserId === actor.sub) throw new ForbiddenException('Quem solicitou o reembolso não pode decidi-lo.');
    if (actor.role !== 'DEV' && ticket.companyId === actor.companyId) throw new ForbiddenException('Você não pode decidir reembolso da sua própria empresa.');
    return ticket;
  }

  async approve(actor: JwtUser, id: string, reason?: string) {
    const ticket = await this.loadRefundTicket(actor, id);
    const status = ticket.refundStatus!;
    if (status === 'PROCESSING' || status === 'CONFIRMED') return { idempotent: true, refundStatus: status, ticketId: id };
    if (status === 'REJECTED' || status === 'FAILED') throw new ConflictException('Este pedido de reembolso já foi encerrado.');
    const amount = Number(ticket.refundAmount);
    const dual = amount > refundDualApprovalAbove();
    const now = new Date();

    if (status === 'REQUESTED' || status === 'APPROVED') {
      if (status === 'REQUESTED' && dual) {
        const claim = await this.prisma.supportTicket.updateMany({ where: { id, refundStatus: 'REQUESTED' }, data: { refundStatus: 'AWAITING_SECOND_APPROVAL', refundDecisionById: actor.sub, refundDecisionAt: now, refundDecisionReason: reason ?? null } });
        if (claim.count !== 1) throw new ConflictException('O pedido foi alterado por outro usuário. Atualize a página.');
        await this.event(id, actor.sub, 'REFUND_FIRST_APPROVAL', { status: 'AWAITING_SECOND_APPROVAL' }, { reason, threshold: refundDualApprovalAbove() });
        await this.notifier.notifyRefundAwaitingSecond(id);
        return { idempotent: false, refundStatus: 'AWAITING_SECOND_APPROVAL', ticketId: id };
      }
      const claim = await this.prisma.supportTicket.updateMany({ where: { id, refundStatus: status }, data: { refundStatus: 'PROCESSING', refundDecisionById: ticket.refundDecisionById ?? actor.sub, refundDecisionAt: ticket.refundDecisionAt ?? now, refundDecisionReason: reason ?? null } });
      if (claim.count !== 1) return { idempotent: true, refundStatus: 'PROCESSING', ticketId: id };
      await this.event(id, actor.sub, 'REFUND_APPROVED', { status: 'PROCESSING' }, { reason });
      await this.notifier.notifyRefundDecision(id, true);
      return this.dispatch(actor, ticket, status, 'REQUESTED');
    }

    // AWAITING_SECOND_APPROVAL
    if (ticket.refundDecisionById === actor.sub) throw new ConflictException('A segunda aprovação precisa ser de outro usuário.');
    const claim = await this.prisma.supportTicket.updateMany({ where: { id, refundStatus: 'AWAITING_SECOND_APPROVAL', refundDecisionById: { not: actor.sub } }, data: { refundStatus: 'PROCESSING', refundSecondApproverId: actor.sub, refundSecondApproverAt: now } });
    if (claim.count !== 1) return { idempotent: true, refundStatus: 'PROCESSING', ticketId: id };
    await this.event(id, actor.sub, 'REFUND_SECOND_APPROVED', { status: 'PROCESSING' }, { reason });
    await this.notifier.notifyRefundDecision(id, true);
    return this.dispatch(actor, ticket, 'AWAITING_SECOND_APPROVAL', 'AWAITING_SECOND_APPROVAL');
  }

  /** Chama o estorno existente com idempotência = id do chamado. Em erro antes da reserva, devolve o chamado ao estado anterior. */
  private async dispatch(actor: JwtUser, ticket: any, _from: string, revertTo: 'REQUESTED' | 'AWAITING_SECOND_APPROVAL') {
    try {
      const op = await this.paymentRefund.request(ticket.invoiceId, {
        amount: ticket.refundKind === 'PARTIAL' ? Number(ticket.refundAmount) : undefined,
        reason: `Reembolso do chamado ${ticket.ticketNumber}`,
        key: ticket.id,
        actorId: actor.sub,
      });
      await this.prisma.supportTicket.update({ where: { id: ticket.id }, data: { paymentRefundId: op.id } });
      await this.event(ticket.id, actor.sub, 'REFUND_PROCESSING', { status: 'PROCESSING', paymentRefundId: op.id });
      if (op.status === 'CONFIRMED') await this.settle(ticket.id, 'CONFIRMED', Number(op.amount));
      else if (op.status === 'FAILED') await this.settle(ticket.id, 'FAILED', Number(op.amount), op.errorMessage);
      const fresh = await this.prisma.supportTicket.findUnique({ where: { id: ticket.id }, select: { refundStatus: true } });
      return { idempotent: false, refundStatus: fresh?.refundStatus ?? 'PROCESSING', ticketId: ticket.id, paymentRefundId: op.id };
    } catch (error) {
      await this.prisma.supportTicket.updateMany({
        where: { id: ticket.id, refundStatus: 'PROCESSING', paymentRefundId: null },
        data: revertTo === 'REQUESTED' ? { refundStatus: 'REQUESTED' } : { refundStatus: 'AWAITING_SECOND_APPROVAL', refundSecondApproverId: null, refundSecondApproverAt: null },
      });
      await this.event(ticket.id, actor.sub, 'REFUND_DISPATCH_ERROR', undefined, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async reject(actor: JwtUser, id: string, reason: string) {
    const ticket = await this.loadRefundTicket(actor, id);
    if (ticket.refundStatus === 'REJECTED') return { idempotent: true, refundStatus: 'REJECTED', ticketId: id };
    if (!['REQUESTED', 'AWAITING_SECOND_APPROVAL'].includes(ticket.refundStatus!)) throw new ConflictException('Este pedido de reembolso não pode mais ser recusado.');
    const claim = await this.prisma.supportTicket.updateMany({
      where: { id, refundStatus: { in: ['REQUESTED', 'AWAITING_SECOND_APPROVAL'] } },
      data: { refundStatus: 'REJECTED', refundDecisionById: actor.sub, refundDecisionAt: new Date(), refundDecisionReason: reason },
    });
    if (claim.count !== 1) throw new ConflictException('O pedido foi alterado por outro usuário. Atualize a página.');
    await this.event(id, actor.sub, 'REFUND_REJECTED', { status: 'REJECTED' }, { reason });
    await this.notifier.notifyRefundDecision(id, false, reason);
    return { idempotent: false, refundStatus: 'REJECTED', ticketId: id };
  }

  /** Transição final CONFIRMED/FAILED, uma única vez (evento e aviso só na primeira). */
  private async settle(ticketId: string, status: 'CONFIRMED' | 'FAILED', amount: number, detail?: string | null) {
    const res = await this.prisma.supportTicket.updateMany({ where: { id: ticketId, category: 'REFUND', refundStatus: { in: ['PROCESSING', 'APPROVED'] } }, data: { refundStatus: status } });
    if (res.count !== 1) return false;
    await this.event(ticketId, null, status === 'CONFIRMED' ? 'REFUND_CONFIRMED' : 'REFUND_FAILED', { status }, { amount, detail: detail ?? undefined });
    if (status === 'CONFIRMED') await this.notifier.notifyRefundConfirmed(ticketId, amount);
    else await this.notifier.notifyRefundFailed(ticketId, detail);
    return true;
  }

  async handleSettled(event: PaymentRefundSettled) {
    const ticketId = event.requestKey.slice(event.invoiceId.length + 1);
    if (!UUID.test(ticketId)) return;
    try { await this.settle(ticketId, event.status, event.amount, event.errorMessage); }
    catch (error) { this.logger.warn(`Não foi possível atualizar o chamado ${ticketId} após o estorno: ${String(error)}`); }
  }
}
