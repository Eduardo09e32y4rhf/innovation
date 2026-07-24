import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { AddSupportMessageDto } from './dto/add-support-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('stats')
  async getStats(@Req() req: any) {
    // simplified stats for MVP client dashboard
    const tickets = await this.supportService.listTickets(req.user);
    return {
      open: tickets.filter(t => ['NEW', 'TRIAGE', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_DEPLOY'].includes(t.status)).length,
      resolved: tickets.filter(t => t.status === 'RESOLVED').length,
      closed: tickets.filter(t => t.status === 'CLOSED').length,
    };
  }

  @Get('tickets')
  async listTickets(@Req() req: any) {
    return this.supportService.listTickets(req.user);
  }

  @Get('tickets/:id')
  async getTicket(@Req() req: any, @Param('id') id: string) {
    return this.supportService.getTicket(req.user, id);
  }

  @Post('tickets')
  async createTicket(@Req() req: any, @Body() data: CreateSupportTicketDto) {
    return this.supportService.createTicket(req.user, data);
  }

  @Post('tickets/:id/messages')
  async addMessage(@Req() req: any, @Param('id') id: string, @Body() data: AddSupportMessageDto) {
    return this.supportService.addMessage(req.user, id, data.message, 'PUBLIC');
  }

  @Post('tickets/:id/close')
  async closeTicket(@Req() req: any, @Param('id') id: string) {
    await this.supportService.closeTicket(req.user, id);
    return { success: true };
  }

  @Post('tickets/:id/reopen')
  async reopenTicket(@Req() req: any, @Param('id') id: string) {
    await this.supportService.reopenTicket(req.user, id);
    return { success: true };
  }

  // attachments will be added later in Phase 3
}