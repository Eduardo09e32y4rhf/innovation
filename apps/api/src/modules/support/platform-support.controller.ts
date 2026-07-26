import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req, Res, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportRepository } from './support.repository';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SupportAuthorizationService } from './support-authorization.service';
import { SupportAttachmentService } from './support-attachment.service';
import { SupportStorageService } from './support-storage.service';

@UseGuards(JwtAuthGuard)
@Controller('platform/support')
export class PlatformSupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly repository: SupportRepository,
    private readonly authService: SupportAuthorizationService,
    private readonly attachmentService: SupportAttachmentService,
    private readonly storageService: SupportStorageService,
  ) {}

  @Get('stats')
  async getStats(@Req() req: any) {
    this.authService.assertCanManageTicket(req.user);
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
  async listTickets(@Req() req: any) {
    this.authService.assertCanManageTicket(req.user);
    return this.supportService.listTickets(req.user);
  }

  @Get('tickets/:id')
  async getTicket(@Req() req: any, @Param('id') id: string) {
    this.authService.assertCanManageTicket(req.user);
    return this.supportService.getTicket(req.user, id);
  }

  @Patch('tickets/:id/assign')
  async assignTicket(@Req() req: any, @Param('id') id: string, @Body('userId') userId: string) {
    this.authService.assertCanManageTicket(req.user);
    const ticket = await this.repository.updateTicket(id, { assignedTo: { connect: { id: userId || req.user.sub } } });
    await this.repository.createEvent({ ticketId: id, actorUserId: req.user.sub, eventType: 'ASSIGNED', newValue: { userId: userId || req.user.sub } });
    return ticket;
  }

  @Patch('tickets/:id/priority')
  async updatePriority(@Req() req: any, @Param('id') id: string, @Body('priority') priority: 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL') {
    this.authService.assertCanManageTicket(req.user);
    const ticket = await this.repository.updateTicket(id, { priority });
    await this.repository.createEvent({ ticketId: id, actorUserId: req.user.sub, eventType: 'PRIORITY_CHANGED', newValue: { priority } });
    return ticket;
  }

  @Patch('tickets/:id/status')
  async updateStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: 'NEW' | 'TRIAGE' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_DEPLOY' | 'RESOLVED' | 'CLOSED' | 'OPEN' | 'REOPENED') {
    this.authService.assertCanManageTicket(req.user);
    const ticket = await this.repository.updateTicket(id, { status });
    await this.repository.createEvent({ ticketId: id, actorUserId: req.user.sub, eventType: 'STATUS_CHANGED', newValue: { status } });
    return ticket;
  }

  @Post('tickets/:id/messages')
  async addMessage(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.supportService.addMessage(req.user, id, data.message, 'PUBLIC');
  }

  @Post('tickets/:id/internal-notes')
  async addInternalNote(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.supportService.addMessage(req.user, id, data.message, 'INTERNAL');
  }

  @Post('tickets/:id/attachments')
  async uploadAttachment(@Req() req: any, @Param('id') id: string, @Body('messageId') messageId?: string) {
    this.authService.assertCanManageTicket(req.user);
    const ticket = await this.supportService.getTicket(req.user, id);
    await this.authService.assertCanUploadAttachment(req.user, ticket);

    const file = await req.file?.();
    if (!file) {
      throw new BadRequestException('Envie um arquivo válido no campo file.');
    }

    const buffer = await file.toBuffer();
    return this.attachmentService.uploadAttachment(req.user, id, {
      originalname: file.filename,
      mimetype: file.mimetype,
      size: buffer.length,
      buffer,
    }, messageId);
  }

  @Get('tickets/:id/attachments/:attachmentId')
  async downloadAttachment(@Req() req: any, @Param('id') id: string, @Param('attachmentId') attachmentId: string, @Res({ passthrough: true }) reply: any) {
    this.authService.assertCanManageTicket(req.user);
    const ticket = await this.supportService.getTicket(req.user, id);
    await this.authService.assertCanViewTicket(req.user, ticket);

    const attachment = await this.attachmentService.getAttachmentById(attachmentId);
    if (attachment.ticketId !== id) {
      throw new ForbiddenException('O anexo não pertence a este chamado.');
    }
    if (attachment.status !== 'CLEAN') {
      throw new ForbiddenException('O anexo ainda está em quarentena.');
    }

    const stream = await this.storageService.getFileStream(attachment.storageKey);
    reply.header('Content-Type', attachment.detectedMimeType || attachment.declaredMimeType || 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename="${attachment.originalName.replace(/"/g, '')}"`);
    return stream;
  }

  @Post('tickets/:id/resolve')
  async resolveTicket(@Req() req: any, @Param('id') id: string) {
    this.authService.assertCanManageTicket(req.user);
    const ticket = await this.repository.updateTicket(id, { status: 'RESOLVED', resolvedAt: new Date() });
    await this.repository.createEvent({ ticketId: id, actorUserId: req.user.sub, eventType: 'TICKET_RESOLVED' });
    return ticket;
  }

  @Post('tickets/:id/close')
  async closeTicket(@Req() req: any, @Param('id') id: string) {
    return this.supportService.closeTicket(req.user, id);
  }
}
