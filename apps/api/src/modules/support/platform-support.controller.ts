import { AssignTicketDto } from './dto/platform-support.dto';
import { AddSupportMessageDto } from './dto/add-support-message.dto';
import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Req, ParseUUIDPipe, HttpCode } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportRepository } from './support.repository';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupportAuthorizationService } from './support-authorization.service';
import { SupportTicketPriority, SupportTicketStatus } from '@prisma/client';
import { ListSupportTicketsQueryDto } from './dto/list-support-tickets-query.dto';
import { UpdateSupportPriorityDto } from './dto/update-support-priority.dto';
import { UpdateSupportStatusDto } from './dto/update-support-status.dto';
import { SupportRefundService } from './support-refund.service';
import { SupportNotificationService } from './support-notification.service';
import { SupportDuplicateService } from './support-duplicate.service';
import { MarkSupportDuplicateDto } from './dto/mark-support-duplicate.dto';
import { RefundDecisionDto, RefundRejectDto } from './dto/support-refund.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'COMERCIAL')
@Controller('platform/support')
export class PlatformSupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly repository: SupportRepository,
    private readonly authService: SupportAuthorizationService,
    private readonly refundService: SupportRefundService,
    private readonly notifier: SupportNotificationService,
    private readonly duplicateService: SupportDuplicateService,
  ) {}

  @Post(':id/duplicate')
  @Roles('DEV', 'CEO')
  async markDuplicate(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: MarkSupportDuplicateDto) {
    return this.duplicateService.markDuplicate(req.user, id, body.duplicateOfId);
  }

  @HttpCode(200)
  @Post(':id/refund/approve')
  @Roles('DEV', 'CEO')
  async approveRefund(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: RefundDecisionDto) {
    return this.refundService.approve(req.user, id, body?.reason);
  }

  @HttpCode(200)
  @Post(':id/refund/reject')
  @Roles('DEV', 'CEO')
  async rejectRefund(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: RefundRejectDto) {
    return this.refundService.reject(req.user, id, body.reason);
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    this.authService.assertCanViewPlatformSupport(req.user);
    const tickets = await this.supportService.listTickets(req.user);
    return {
      new: tickets.filter(t => t.status === 'NEW').length,
      triage: tickets.filter(t => t.status === 'TRIAGE').length,
      inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
      unassigned: tickets.filter(t => !t.assignedToUserId).length,
      waitingCustomer: tickets.filter(t => t.status === 'WAITING_CUSTOMER').length,
      waitingDeploy: tickets.filter(t => t.status === 'WAITING_DEPLOY').length,
      resolved: tickets.filter(t => t.status === 'RESOLVED').length,
      closed: tickets.filter(t => t.status === 'CLOSED').length,
      slaBreached: tickets.filter(t => t.slaBreached).length,
    };
  }

  @Get('tickets')
  async listTickets(@Req() req: any, @Query() query: ListSupportTicketsQueryDto) {
    this.authService.assertCanViewPlatformSupport(req.user);
    return this.supportService.listTickets(req.user, query);
  }

  @Get('tickets/:id')
  async getTicket(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    this.authService.assertCanViewPlatformSupport(req.user);
    return this.supportService.getTicket(req.user, id);
  }

  @Patch('tickets/:id/assign')
  @Roles('DEV')
  async assignTicket(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: AssignTicketDto) {
    const userId = body.userId;
    this.authService.assertCanManageTicket(req.user);
    const ticket = await this.repository.updateTicket(id, { assignedTo: { connect: { id: userId || req.user.sub } } });
    await this.repository.createEvent({ ticketId: id, actorUserId: req.user.sub, eventType: 'ASSIGNED', newValue: { userId: userId || req.user.sub } });
    return ticket;
  }

  @Patch('tickets/:id/priority')
  @Roles('DEV')
  async updatePriority(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateSupportPriorityDto) {
    const priority: SupportTicketPriority = body.priority;
    this.authService.assertCanManageTicket(req.user);
    const ticket = await this.repository.updateTicket(id, { priority });
    await this.repository.createEvent({ ticketId: id, actorUserId: req.user.sub, eventType: 'PRIORITY_CHANGED', newValue: { priority } });
    return ticket;
  }

  @Patch('tickets/:id/status')
  @Roles('DEV')
  async updateStatus(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateSupportStatusDto) {
    this.authService.assertCanManageTicket(req.user);
    const status = body.status as SupportTicketStatus;
    const lifecycle: any = { status };
    if (status === 'RESOLVED') lifecycle.resolvedAt = new Date();
    if (status === 'CLOSED') lifecycle.closedAt = new Date();
    if (status === 'REOPENED') {
      lifecycle.resolvedAt = null;
      lifecycle.closedAt = null;
    }
    const ticket = await this.repository.updateTicket(id, lifecycle);
    await this.repository.createEvent({ ticketId: id, actorUserId: req.user.sub, eventType: 'STATUS_CHANGED', newValue: { status } });
    await this.notifier.notifyStatusChange(id, status);
    return ticket;
  }

  @Post('tickets/:id/messages')
  @Roles('DEV')
  async addMessage(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() data: AddSupportMessageDto) {
    return this.supportService.addMessage(req.user, id, data.message, 'PUBLIC');
  }

  @Post('tickets/:id/internal-notes')
  @Roles('DEV')
  async addInternalNote(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() data: AddSupportMessageDto) {
    return this.supportService.addMessage(req.user, id, data.message, 'INTERNAL');
  }

  @Post('tickets/:id/resolve')
  @Roles('DEV')
  async resolveTicket(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    this.authService.assertCanManageTicket(req.user);
    const ticket = await this.repository.updateTicket(id, { status: 'RESOLVED', resolvedAt: new Date() });
    await this.repository.createEvent({ ticketId: id, actorUserId: req.user.sub, eventType: 'TICKET_RESOLVED' });
    await this.notifier.notifyStatusChange(id, 'RESOLVED');
    return ticket;
  }

  @HttpCode(200)
  @Post('tickets/:id/close')
  @Roles('DEV')
  async closeTicket(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.supportService.closeTicket(req.user, id);
  }
}
