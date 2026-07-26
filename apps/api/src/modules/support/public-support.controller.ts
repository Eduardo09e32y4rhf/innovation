import { Controller, Post, Body, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupportRepository } from './support.repository';
import { SupportSlaService } from './support-sla.service';
import { PrismaService } from '../../database/prisma.service';
import { CreatePublicSupportTicketDto } from './dto/create-public-support-ticket.dto';
import { RequestPasswordResetDto } from '../auth/dto/request-password-reset.dto';

@Controller('support/public')
export class PublicSupportController {
  constructor(
    private readonly repository: SupportRepository,
    private readonly slaService: SupportSlaService,
    private readonly prisma: PrismaService
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @Post('tickets')
  async createTicket(@Body() data: CreatePublicSupportTicketDto, @Req() req: any) {
    // Se o honeypot for preenchido, rejeita silenciosamente (simula sucesso para enganar o bot)
    if (data.website) {
      return { success: true, message: 'Sua solicitação foi registrada. O suporte analisará o caso.', ticketNumber: 'BOT-' + Date.now() };
    }

    const year = new Date().getFullYear();
    const ticketNumber = await this.repository.generateTicketNumber(year);
    const { firstResponseDueAt, resolutionDueAt } = this.slaService.calculateDueDates('NORMAL');

    // Attempt to match user silently
    let affectedUserId = null;
    let companyId = null;
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
      metadata: { source: 'PUBLIC_FORM' }
    });

    return {
      success: true,
      message: 'Sua solicitação foi registrada. O suporte analisará o caso.',
      ticketNumber: ticket.ticketNumber
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @Post('password-reset')
  async requestPasswordReset(@Body() data: RequestPasswordResetDto, @Req() req: any) {
    // Se o honeypot for preenchido, rejeita silenciosamente (simula sucesso)
    if (data.website) {
      return { success: true, message: 'Sua solicitação foi registrada. O suporte analisará o caso.', ticketNumber: 'BOT-' + Date.now() };
    }

    const year = new Date().getFullYear();
    const ticketNumber = await this.repository.generateTicketNumber(year);
    const { firstResponseDueAt, resolutionDueAt } = this.slaService.calculateDueDates('HIGH');

    let affectedUserId = null;
    let companyId = null;
    if (data.email) {
      const user = await this.prisma.user.findFirst({ where: { email: data.email } });
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
      requesterEmail: data.email?.toLowerCase()?.trim(),
      affectedUserId,
      companyId,
      firstResponseDueAt,
      resolutionDueAt,
    });

    await this.repository.createEvent({
      ticketId: ticket.id,
      eventType: 'PASSWORD_RESET_REQUESTED',
    });

    return {
      success: true,
      message: 'Sua solicitação foi registrada. O suporte analisará o caso.',
      ticketNumber: ticket.ticketNumber
    };
  }
}
