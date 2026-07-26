import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, UseInterceptors, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SupportService } from './support.service';
import { SupportAttachmentService } from './support-attachment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { AddSupportMessageDto } from './dto/add-support-message.dto';
import { ListSupportTicketsQueryDto } from './dto/list-support-tickets-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly attachmentService: SupportAttachmentService
  ) {}

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
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Req() req: any,
    @Param('id') ticketId: string,
    @UploadedFile() file: any
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.attachmentService.uploadAttachment(req.user, ticketId, file);
  }

  @Get('tickets/:id/attachments/:attachmentId/download')
  async downloadAttachment(
    @Req() req: any,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response
  ) {
    const { stream, mimetype, filename, size } = await this.attachmentService.downloadAttachment(req.user, id, attachmentId);
    
    res.set({
      'Content-Type': mimetype || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': size
    });

    stream.pipe(res);
  }
}
