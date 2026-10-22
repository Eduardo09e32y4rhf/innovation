import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { SupportNotificationService } from './support-notification.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Marca um chamado como duplicado de outro da mesma empresa (ou ambos da plataforma, sem empresa). */
@Injectable()
export class SupportDuplicateService {
  constructor(private readonly prisma: PrismaService, private readonly notifier: SupportNotificationService) {}

  async markDuplicate(actor: JwtUser, id: string, duplicateOfId: string) {
    if (actor.role !== 'DEV' && actor.role !== 'CEO') throw new ForbiddenException('Seu perfil não pode marcar chamados como duplicados.');
    if (!UUID.test(id) || !UUID.test(duplicateOfId)) throw new NotFoundException('Chamado não encontrado.');
    if (id === duplicateOfId) throw new BadRequestException('Um chamado não pode ser duplicado de si mesmo.');

    const [ticket, original] = await Promise.all([
      this.prisma.supportTicket.findUnique({ where: { id }, select: { id: true, status: true, companyId: true } }),
      this.prisma.supportTicket.findUnique({ where: { id: duplicateOfId }, select: { id: true, ticketNumber: true, status: true, companyId: true, duplicateOfId: true } }),
    ]);
    if (!ticket) throw new NotFoundException('Chamado não encontrado.');
    if (!original) throw new NotFoundException('Chamado original não encontrado.');
    if ((ticket.companyId ?? null) !== (original.companyId ?? null)) throw new BadRequestException('O chamado original precisa ser da mesma empresa.');
    if (original.status === 'DUPLICATE' || original.duplicateOfId) throw new BadRequestException('O chamado original já é um duplicado. Use o chamado principal.');
    if (ticket.status === 'DUPLICATE') throw new ConflictException('Este chamado já foi marcado como duplicado.');
    if (ticket.status === 'CANCELLED') throw new BadRequestException('Chamado cancelado não pode ser marcado como duplicado.');

    const claim = await this.prisma.supportTicket.updateMany({
      where: { id, status: { not: 'DUPLICATE' } },
      data: { status: 'DUPLICATE', duplicateOfId, closedAt: new Date() },
    });
    if (claim.count !== 1) throw new ConflictException('O chamado foi alterado por outro usuário. Atualize a página.');
    await this.prisma.supportTicketEvent.create({
      data: {
        ticketId: id, actorUserId: actor.sub, eventType: 'TICKET_DUPLICATE',
        previousValue: { status: ticket.status } as any, newValue: { status: 'DUPLICATE', duplicateOfId, duplicateOfNumber: original.ticketNumber } as any,
      },
    });
    await this.notifier.notifyDuplicate(id, original.ticketNumber);
    return { success: true, status: 'DUPLICATE', duplicateOfId, duplicateOfNumber: original.ticketNumber };
  }
}
