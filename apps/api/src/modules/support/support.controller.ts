import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Res, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { contentDisposition } from '../../common/pdf/pdf-response';
import { readMultipartUpload } from '../../common/http/multipart-upload';
import { SupportService } from './support.service';
import { SupportAttachmentService, SUPPORT_ATTACHMENT_MAX_BYTES } from './support-attachment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { AddSupportMessageDto } from './dto/add-support-message.dto';
import { ListSupportTicketsQueryDto } from './dto/list-support-tickets-query.dto';
import { SupportRefundService } from './support-refund.service';
import { SupportSatisfactionService } from './support-satisfaction.service';
import { CreateRefundRequestDto, RateTicketDto } from './dto/support-refund.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA')
@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly attachmentService: SupportAttachmentService,
    private readonly refundService: SupportRefundService,
    private readonly satisfactionService: SupportSatisfactionService,
  ) {}

  @Post('refund-requests')
  @Roles('ADMIN')
  async createRefundRequest(@Req() req: any, @Body() dto: CreateRefundRequestDto) {
    return this.refundService.createRequest(req.user, dto);
  }

  @Post(':id/rating')
  async rate(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RateTicketDto) {
    return this.satisfactionService.rate(req.user, id, dto.score, dto.comment);
  }

  @Post(':id/reopen')
  async reopenResolved(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.satisfactionService.reopen(req.user, id);
  }

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
  async listTickets(@Req() req: any, @Query() query: ListSupportTicketsQueryDto) {
    return this.supportService.listTickets(req.user, query);
  }

  @Get('tickets/:id')
  async getTicket(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.supportService.getTicket(req.user, id);
  }

  @Post('tickets')
  async createTicket(@Req() req: any, @Body() data: CreateSupportTicketDto) {
    return this.supportService.createTicket(req.user, data);
  }

  @Post('tickets/:id/messages')
  async addMessage(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() data: AddSupportMessageDto) {
    return this.supportService.addMessage(req.user, id, data.message, data.visibility || 'PUBLIC');
  }

  @Post('tickets/:id/close')
  async closeTicket(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.supportService.closeTicket(req.user, id);
    return { success: true };
  }

  @Post('tickets/:id/reopen')
  async reopenTicket(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.supportService.reopenTicket(req.user, id);
    return { success: true };
  }

  @Post('tickets/:id/attachments')
  async uploadAttachment(@Req() req: any, @Param('id', ParseUUIDPipe) ticketId: string) {
    const { file } = await readMultipartUpload(req, { maxBytes: SUPPORT_ATTACHMENT_MAX_BYTES });
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.attachmentService.uploadAttachment(req.user, ticketId, file);
  }

  @Get('tickets/:id/attachments/:attachmentId/download')
  async downloadAttachment(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId') attachmentId: string,
    @Res() reply: FastifyReply,
  ) {
    const { stream, mimetype, filename, size } = await this.attachmentService.downloadAttachment(req.user, id, attachmentId);
    // Fastify: cabecalhos via reply.header e corpo via reply.send(stream) (res.set e pipe para o reply nao existem no Fastify).
    reply
      .header('Content-Type', mimetype || 'application/octet-stream')
      .header('Content-Disposition', contentDisposition(filename))
      .header('X-Content-Type-Options', 'nosniff')
      .header('Cache-Control', 'private, no-store');
    if (Number.isFinite(size) && size > 0) reply.header('Content-Length', String(size));
    return reply.send(stream);
  }
}
