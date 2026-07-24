import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportRepository } from './support.repository';
import { SupportAuthorizationService } from './support-authorization.service';
import { SupportSlaService } from './support-sla.service';
import { SupportTicketPriority } from '@prisma/client';

@Injectable()
export class SupportService {
  constructor(
    private readonly repository: SupportRepository,
    private readonly authService: SupportAuthorizationService,
    private readonly slaService: SupportSlaService,
  ) {}

  async createTicket(actor: any, data: any) {
    await this.authService.assertCanCreateTicket(actor, data.affectedUserId, data.affectedEmployeeId);

    const year = new Date().getFullYear();
    const ticketNumber = await this.repository.generateTicketNumber(year);
    
    // Auto calculate initial priority based on Impact if not explicitly handled (for now defaults to NORMAL, unless set)
    let initialPriority: SupportTicketPriority = SupportTicketPriority.NORMAL;
    if (data.impact?.includes('toda empresa') || data.impact?.includes('perda de dados') || data.category === 'SECURITY') {
      initialPriority = SupportTicketPriority.CRITICAL;
    } else if (data.impact?.includes('Alguns usuários')) {
      initialPriority = SupportTicketPriority.HIGH;
    } else if (data.category === 'FEATURE_REQUEST') {
      initialPriority = SupportTicketPriority.LOW;
    }

    const { firstResponseDueAt, resolutionDueAt } = this.slaService.calculateDueDates(initialPriority);

    const ticket = await this.repository.createTicket({
      ...data,
      ticketNumber,
      companyId: actor.companyId,
      createdByUserId: actor.id,
      priority: initialPriority,
      firstResponseDueAt,
      resolutionDueAt,
      source: 'AUTHENTICATED'
    });

    await this.repository.createEvent({
      ticketId: ticket.id,
      actorUserId: actor.id,
      eventType: 'TICKET_CREATED',
    });

    return ticket;
  }

  async listTickets(actor: any) {
    const where = await this.authService.buildTicketListWhere(actor);
    return this.repository.findTickets(where);
  }

  async getTicket(actor: any, id: string) {
    const ticket = await this.repository.findTicketById(id);
    if (!ticket) throw new NotFoundException('Chamado não encontrado.');
    await this.authService.assertCanViewTicket(actor, ticket);
    return ticket;
  }

  async addMessage(actor: any, id: string, message: string, visibility: 'PUBLIC' | 'INTERNAL' = 'PUBLIC') {
    const ticket = await this.getTicket(actor, id);
    if (visibility === 'INTERNAL') {
      this.authService.assertCanCreateInternalNote(actor);
    } else {
      await this.authService.assertCanReplyTicket(actor, ticket);
    }

    const msg = await this.repository.createMessage({
      ticketId: id,
      authorUserId: actor.id,
      message,
      visibility,
      authorName: actor.name,
      authorEmail: actor.email
    });

    await this.repository.createEvent({
      ticketId: id,
      actorUserId: actor.id,
      eventType: visibility === 'PUBLIC' ? 'PUBLIC_REPLY' : 'INTERNAL_NOTE',
    });

    // Update ticket status or last reply times
    const updateData: any = {};
    if (visibility === 'PUBLIC') {
      if (actor.role === 'DEV') {
        updateData.lastDevReplyAt = new Date();
        if (!ticket.firstRespondedAt) updateData.firstRespondedAt = new Date();
        if (ticket.status === 'NEW' || ticket.status === 'TRIAGE') updateData.status = 'IN_PROGRESS';
      } else {
        updateData.lastCustomerReplyAt = new Date();
      }
    }
    
    if (Object.keys(updateData).length > 0) {
      await this.repository.updateTicket(id, updateData);
    }

    return msg;
  }

  async closeTicket(actor: any, id: string) {
    const ticket = await this.getTicket(actor, id);
    await this.authService.assertCanCloseTicket(actor, ticket);

    await this.repository.updateTicket(id, {
      status: 'CLOSED',
      closedAt: new Date()
    });

    await this.repository.createEvent({
      ticketId: id,
      actorUserId: actor.id,
      eventType: 'TICKET_CLOSED',
    });
  }

  async reopenTicket(actor: any, id: string) {
    const ticket = await this.getTicket(actor, id);
    await this.authService.assertCanCloseTicket(actor, ticket); // reusing same permission logic for now

    await this.repository.updateTicket(id, {
      status: 'IN_PROGRESS',
      closedAt: null,
      resolvedAt: null
    });

    await this.repository.createEvent({
      ticketId: id,
      actorUserId: actor.id,
      eventType: 'TICKET_REOPENED',
    });
  }
}