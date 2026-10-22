import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { SupportNotificationService } from './support-notification.service';

export const REOPEN_WINDOW_DAYS = 7;
const DAY = 86_400_000;

/** Avaliação (CSAT) e reabertura de chamados encerrados. */
@Injectable()
export class SupportSatisfactionService {
  constructor(private readonly prisma: PrismaService, private readonly notifier: SupportNotificationService) {}

  private async load(actor: JwtUser, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id, companyId: actor.companyId } });
    if (!ticket) throw new NotFoundException('Chamado não encontrado.');
    return ticket;
  }

  async rate(actor: JwtUser, id: string, score: number, comment?: string) {
    if (!Number.isInteger(score) || score < 1 || score > 5) throw new BadRequestException('A nota deve ser um número inteiro de 1 a 5.');
    const ticket = await this.load(actor, id);
    if (ticket.createdByUserId !== actor.sub) throw new ForbiddenException('Somente quem abriu o chamado pode avaliá-lo.');
    if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') throw new BadRequestException('Só é possível avaliar chamados resolvidos ou fechados.');
    if (ticket.satisfactionScore !== null) throw new ConflictException('Este chamado já foi avaliado.');
    const at = new Date();
    const res = await this.prisma.supportTicket.updateMany({ where: { id, satisfactionScore: null }, data: { satisfactionScore: score, satisfactionComment: comment?.trim() || null, satisfactionAt: at } });
    if (res.count !== 1) throw new ConflictException('Este chamado já foi avaliado.');
    await this.prisma.supportTicketEvent.create({ data: { ticketId: id, actorUserId: actor.sub, eventType: 'TICKET_RATED', newValue: { score } } });
    return { success: true, satisfactionScore: score, satisfactionComment: comment?.trim() || null, satisfactionAt: at };
  }

  async reopen(actor: JwtUser, id: string) {
    const ticket = await this.load(actor, id);
    if (ticket.createdByUserId !== actor.sub && actor.role !== 'ADMIN') throw new ForbiddenException('Somente quem abriu o chamado (ou o administrador) pode reabri-lo.');
    if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') throw new BadRequestException('Só é possível reabrir chamados resolvidos ou fechados.');
    const since = ticket.resolvedAt ?? ticket.closedAt;
    if (!since || Date.now() - new Date(since).getTime() > REOPEN_WINDOW_DAYS * DAY) throw new BadRequestException(`O prazo de ${REOPEN_WINDOW_DAYS} dias para reabrir este chamado terminou. Abra um novo chamado.`);
    const res = await this.prisma.supportTicket.updateMany({ where: { id, status: { in: ['RESOLVED', 'CLOSED'] } }, data: { status: 'REOPENED', resolvedAt: null, closedAt: null } });
    if (res.count !== 1) throw new ConflictException('O chamado foi alterado por outro usuário. Atualize a página.');
    await this.prisma.supportTicketEvent.create({ data: { ticketId: id, actorUserId: actor.sub, eventType: 'TICKET_REOPENED', previousValue: { status: ticket.status }, newValue: { status: 'REOPENED' } } });
    return { success: true, status: 'REOPENED' };
  }
}
