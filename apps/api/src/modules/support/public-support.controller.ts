import { BadRequestException, Controller, Post, Body, Req } from '@nestjs/common';
import { SupportRepository } from './support.repository';
import { SupportSlaService } from './support-sla.service';
import { PrismaService } from '../../database/prisma.service';
import { CreatePublicSupportTicketDto } from './dto/create-public-support-ticket.dto';

@Controller('support/public')
export class PublicSupportController {
  constructor(
    private readonly repository: SupportRepository,
    private readonly slaService: SupportSlaService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('tickets')
  async createTicket(@Body() data: CreatePublicSupportTicketDto) {
    const ticketNumber = await this.createPublicTicket(data);
    return {
      success: true,
      message: 'Sua solicitação foi registrada. O suporte analisará o caso.',
      ticketNumber,
    };
  }

  @Post('password-reset')
  async requestPasswordReset(@Body() data: { email?: string; honeypot?: string }) {
    if (data?.honeypot) {
      return {
        success: true,
        message: 'Sua solicitação foi registrada. O suporte analisará o caso.',
      };
    }

    const ticketNumber = await this.createPasswordResetTicket(data.email);
    return {
      success: true,
      message: 'Sua solicitação foi registrada. O suporte analisará o caso.',
      ticketNumber,
    };
  }

  private async createPublicTicket(data: CreatePublicSupportTicketDto) {
    if (data.honeypot) {
      return this.repository.generateTicketNumber(new Date().getFullYear());
    }

    const year = new Date().getFullYear();
    const ticketNumber = await this.repository.generateTicketNumber(year);
    const { firstResponseDueAt, resolutionDueAt } = this.slaService.calculateDueDates('NORMAL');

    let affectedUserId: string | null = null;
    let companyId: string | null = null;
    if (data.email) {
      const user = await this.prisma.user.findFirst({ where: { email: data.email, isActive: true } });
      if (user) {
        affectedUserId = user.id;
        companyId = user.companyId;
      }
    }

    const ticket = await this.repository.createTicket({
      ticketNumber,
      source: 'LOGIN_PUBLIC',
      category: data.category || 'OTHER',
      status: 'NEW',
      priority: 'NORMAL',
      title: data.subject || 'Problema reportado publicamente',
      description: data.description,
      requesterEmail: data.email,
      requesterName: data.name,
      pageUrl: data.pageUrl,
      affectedUserId,
      companyId,
      firstResponseDueAt,
      resolutionDueAt,
    });

    await this.repository.createEvent({
      ticketId: ticket.id,
      eventType: 'TICKET_CREATED',
      metadata: { source: 'PUBLIC_FORM' },
    });

    return ticket.ticketNumber;
  }

  private async createPasswordResetTicket(email?: string) {
    const year = new Date().getFullYear();
    const ticketNumber = await this.repository.generateTicketNumber(year);
    const { firstResponseDueAt, resolutionDueAt } = this.slaService.calculateDueDates('HIGH');

    let affectedUserId: string | null = null;
    let companyId: string | null = null;
    if (email) {
      const user = await this.prisma.user.findFirst({ where: { email } });
      if (user) {
        affectedUserId = user.id;
        companyId = user.companyId;
      }
    }

    const ticket = await this.repository.createTicket({
      ticketNumber,
      source: 'PASSWORD_RESET',
      category: 'PASSWORD_RESET',
      status: 'NEW',
      priority: 'HIGH',
      title: 'Solicitação de redefinição de senha',
      description: 'O usuário solicitou redefinição de senha na tela de login.',
      requesterEmail: email,
      affectedUserId,
      companyId,
      firstResponseDueAt,
      resolutionDueAt,
    });

    await this.repository.createEvent({
      ticketId: ticket.id,
      eventType: 'PASSWORD_RESET_REQUESTED',
    });

    return ticket.ticketNumber;
  }
}
