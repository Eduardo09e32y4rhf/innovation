import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { FaturasAcoesService } from './faturas-acoes.service';

const TAG = '[REEMBOLSO fatura ';
const UUID = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const OPEN_STATUSES = ['NEW', 'TRIAGE', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_DEPLOY', 'REOPENED'];
const brl = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export type RefundDecision = { action: 'APPROVE' | 'REJECT'; amount?: number; note?: string };

/**
 * Fila de pedidos de reembolso feitos pelo cliente. O pedido nasce como chamado de cobrança; aqui a plataforma
 * (Dev, CEO, Contábil) decide: aprovar devolve o dinheiro pelo provedor, recusar explica o motivo. Os dois resolvem o chamado.
 */
@Injectable()
export class FaturasReembolsosService {
  constructor(private readonly prisma: PrismaService, private readonly acoes: FaturasAcoesService) {}

  async list(status: 'abertos' | 'todos' = 'abertos') {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { category: 'BILLING' as any, title: { startsWith: TAG }, ...(status === 'abertos' ? { status: { in: OPEN_STATUSES as any } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, ticketNumber: true, status: true, createdAt: true, description: true, title: true, companyId: true, requesterName: true, requesterEmail: true },
    });
    const invoiceIds = tickets.map((t) => UUID.exec(t.title)?.[1]).filter(Boolean) as string[];
    const companyIds = [...new Set(tickets.map((t) => t.companyId).filter(Boolean))] as string[];
    const [invoices, companies] = await Promise.all([
      this.prisma.platformInvoice.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, description: true, amount: true, paidAt: true, refundedAmount: true, refundStatus: true, billingType: true, provider: true, status: true } }),
      this.prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true, document: true } }),
    ]);
    const invoiceById = new Map(invoices.map((i) => [i.id, i]));
    const companyById = new Map(companies.map((c) => [c.id, c]));
    return tickets.map((t) => {
      const invoice = invoiceById.get(UUID.exec(t.title)?.[1] ?? '');
      const amount = Number(invoice?.amount ?? 0), refunded = Number(invoice?.refundedAmount ?? 0);
      return {
        ticketId: t.id, ticketNumber: t.ticketNumber, status: t.status, requestedAt: t.createdAt,
        reason: t.description.split('Motivo informado pelo cliente:')[1]?.trim() ?? t.description,
        requester: { name: t.requesterName, email: t.requesterEmail },
        company: companyById.get(t.companyId ?? '') ?? null,
        invoice: invoice ? { id: invoice.id, description: invoice.description, amount, paidAt: invoice.paidAt, refundedAmount: refunded, refundable: Math.max(0, amount - refunded), billingType: invoice.billingType, provider: invoice.provider, refundStatus: invoice.refundStatus } : null,
      };
    });
  }

  async decide(ticketId: string, dto: RefundDecision, actor: JwtUser) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id: ticketId, category: 'BILLING' as any, title: { startsWith: TAG } }, select: { id: true, ticketNumber: true, status: true, title: true, companyId: true } });
    if (!ticket) throw new NotFoundException('Pedido de reembolso não encontrado.');
    if (!OPEN_STATUSES.includes(String(ticket.status))) throw new BadRequestException('Este pedido já foi decidido.');
    const note = String(dto.note ?? '').trim();
    if (dto.action === 'REJECT' && note.length < 5) throw new BadRequestException('Explique ao cliente o motivo da recusa (mínimo 5 letras).');
    const invoiceId = UUID.exec(ticket.title)?.[1];
    const invoice = invoiceId ? await this.prisma.platformInvoice.findFirst({ where: { id: invoiceId, companyId: ticket.companyId ?? undefined, deletedAt: null } }) : null;
    if (!invoice) throw new NotFoundException('A fatura deste pedido não existe mais.');

    let text: string;
    if (dto.action === 'APPROVE') {
      const remaining = Math.max(0, Number(invoice.amount) - Number(invoice.refundedAmount ?? 0));
      if (remaining <= 0) throw new BadRequestException('Esta fatura já foi totalmente devolvida.');
      const amount = dto.amount === undefined ? remaining : Math.round(Number(dto.amount) * 100) / 100;
      if (!(amount > 0) || amount > remaining + 0.001) throw new BadRequestException(`Informe um valor entre R$ 0,01 e ${brl(remaining)}.`);
      const reason = `Pedido ${ticket.ticketNumber} aprovado${note ? `: ${note}` : ''}`.slice(0, 300);
      if (amount >= remaining - 0.001) await this.acoes.fullRefund(invoice.id, reason, actor, ticket.id);
      else await this.acoes.partialRefund(invoice.id, { amount, reason, idempotencyKey: ticket.id } as any, actor);
      text = `Seu pedido de reembolso foi APROVADO: ${brl(amount)}${amount < remaining - 0.001 ? ' (parcial)' : ''}. A devolução é feita pelo meio de pagamento original e pode levar alguns dias para aparecer; acompanhe em Faturas → Devoluções.${note ? `\n\nObservação: ${note}` : ''}`;
    } else {
      text = `Seu pedido de reembolso NÃO foi aprovado.\n\nMotivo: ${note}\n\nSe quiser, responda este chamado com mais informações.`;
    }

    await this.prisma.$transaction([
      this.prisma.supportTicketMessage.create({ data: { ticketId: ticket.id, authorUserId: actor.sub, authorName: actor.name ?? 'Financeiro Innovation', authorEmail: actor.email, visibility: 'PUBLIC' as any, message: text } }),
      this.prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'RESOLVED' as any } }),
      this.prisma.supportTicketEvent.create({ data: { ticketId: ticket.id, actorUserId: actor.sub, eventType: dto.action === 'APPROVE' ? 'REFUND_APPROVED' : 'REFUND_REJECTED', metadata: { invoiceId: invoice.id, amount: dto.amount ?? null, note } as any } }),
      this.prisma.auditLog.create({ data: { companyId: invoice.companyId, userId: actor.sub, action: dto.action === 'APPROVE' ? 'FATURAS_REFUND_APPROVED' : 'FATURAS_REFUND_REJECTED', entity: 'PlatformInvoice', entityId: invoice.id, metadata: { ticket: ticket.ticketNumber, note, amount: dto.amount ?? null } as any } }),
    ]);
    return { ticketNumber: ticket.ticketNumber, decision: dto.action };
  }
}


