import { Controller, Get, Post, Body, Param, UseGuards, Req, Res, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { AddSupportMessageDto } from './dto/add-support-message.dto';
import { SupportAttachmentService } from './support-attachment.service';
import { SupportAuthorizationService } from './support-authorization.service';
import { SupportStorageService } from './support-storage.service';

@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly attachmentService: SupportAttachmentService,
    private readonly authService: SupportAuthorizationService,
    private readonly storageService: SupportStorageService,
  ) {}

  @Get('stats')
  async getStats(@Req() req: any) {
    const tickets = await this.supportService.listTickets(req.user);
    return {
      open: tickets.filter((t: any) => ['NEW', 'TRIAGE', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_DEPLOY'].includes(t.status)).length,
      resolved: tickets.filter((t: any) => t.status === 'RESOLVED').length,
      closed: tickets.filter((t: any) => t.status === 'CLOSED').length,
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
    return this.supportService.addMessage(req.user, id, data.message, data.visibility || 'PUBLIC');
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

  @Post('tickets/:id/attachments')
  async uploadAttachment(@Req() req: any, @Param('id') id: string, @Body('messageId') messageId?: string) {
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
    const ticket = await this.supportService.getTicket(req.user, id);
    await this.authService.assertCanViewTicket(req.user, ticket);

    const attachment = await this.attachmentService.getAttachmentById(attachmentId);
    if (attachment.ticketId !== id) {
      throw new ForbiddenException('O anexo não pertence a este chamado.');
    }
    if (attachment.status !== 'CLEAN' && req.user.role !== 'DEV') {
      throw new ForbiddenException('O anexo ainda está em quarentena.');
    }

    const stream = await this.storageService.getFileStream(attachment.storageKey);
    reply.header('Content-Type', attachment.detectedMimeType || attachment.declaredMimeType || 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename="${attachment.originalName.replace(/"/g, '')}"`);
    return stream;
  }
}
