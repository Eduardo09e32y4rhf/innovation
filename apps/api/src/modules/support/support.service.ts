import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupportRepository } from './support.repository';
import { PROTOCOL_LENGTH, protocolSearchTerm } from './support-protocol';
import { buildTimeline } from './support-timeline';
import { toSaoPauloDateKey } from '../../common/utils/date.utils';
import { SupportAuthorizationService } from './support-authorization.service';
import { SupportSlaService } from './support-sla.service';
import { SupportTicketPriority } from '@prisma/client';
import type { JwtUser } from '../../common/types/auth.types';
import { ListSupportTicketsQueryDto } from './dto/list-support-tickets-query.dto';

@Injectable()
export class SupportService {
  constructor(
    private readonly repository: SupportRepository,
    private readonly authService: SupportAuthorizationService,
    private readonly slaService: SupportSlaService,
  ) {}

  async createTicket(actor: JwtUser, data: any) {
    await this.authService.assertCanCreateTicket(actor, data.affectedUserId, data.affectedEmployeeId);
    // Chamado de funcionario sempre fica em nome dele: e assim que ele o encontra e acompanha na lista.
    if (actor.role === 'FUNCIONARIO') data = { ...data, affectedUserId: actor.sub };

    const ticketNumber = await this.repository.generateTicketNumber();

    let initialPriority: SupportTicketPriority = SupportTicketPriority.NORMAL;
    if (data.priority) {
      initialPriority = data.priority;
    } else if (data.impact?.includes('toda empresa') || data.impact?.includes('perda de dados') || data.category === 'SECURITY') {
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
      createdByUserId: actor.sub,
      priority: initialPriority,
      firstResponseDueAt,
      resolutionDueAt,
      source: 'AUTHENTICATED'
    });

    await this.repository.createEvent({
      ticketId: ticket.id,
      actorUserId: actor.sub,
      eventType: 'TICKET_CREATED',
      metadata: { source: 'WEB_APP', category: data.category }
    });

    return this.serializeTicket(ticket);
  }

  async listTickets(actor: JwtUser, query?: ListSupportTicketsQueryDto) {
    const baseWhere = await this.authService.buildTicketListWhere(actor);
    // Cada filtro entra como uma condicao propria no AND: o OR de visibilidade do perfil nunca e sobrescrito.
    const filters: any[] = [];

    if (query?.status) filters.push({ status: query.status });
    if (query?.priority) filters.push({ priority: query.priority });
    if (query?.category) filters.push({ category: query.category });
    // companyId sempre vem do token para clientes. Apenas DEV pode consultar o
    // atendimento de outra empresa no painel de plataforma.
    if (query?.companyId && actor.role === 'DEV') filters.push({ companyId: query.companyId });
    if (query?.search) {
      filters.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { ticketNumber: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }
    const protocol = query?.protocol ? protocolSearchTerm(query.protocol) : '';
    if (protocol) filters.push({ ticketNumber: protocol.length === PROTOCOL_LENGTH ? protocol : { contains: protocol } });
    const range = this.createdAtRange(query?.dateFrom, query?.dateTo);
    if (range) filters.push({ createdAt: range });

    return this.repository.findTickets(filters.length ? { AND: [baseWhere, ...filters] } : baseWhere);
  }

  /** Dias de calendario de Sao Paulo (sem horario de verao desde 2019: UTC-3 fixo). `dateTo` inclui o dia inteiro. */
  private createdAtRange(dateFrom?: string, dateTo?: string) {
    const start = (day: string) => {
      const date = new Date(`${day}T00:00:00-03:00`);
      // O V8 aceita 2026-02-31 e rola para 03/03: conferir que o dia volta igual.
      if (Number.isNaN(date.getTime()) || toSaoPauloDateKey(date) !== day) throw new BadRequestException(`Data inválida: ${day}.`);
      return date;
    };
    const range: { gte?: Date; lt?: Date } = {};
    if (dateFrom) range.gte = start(dateFrom);
    if (dateTo) range.lt = new Date(start(dateTo).getTime() + 86_400_000);
    if (range.gte && range.lt && range.gte >= range.lt) throw new BadRequestException('A data inicial não pode ser depois da data final.');
    return range.gte || range.lt ? range : null;
  }

  /** Busca exata pelo numero de protocolo, so dentro do que o perfil pode ver. */
  async getTicketByProtocol(actor: JwtUser, input: string) {
    const protocol = protocolSearchTerm(input);
    if (!protocol) throw new BadRequestException('Informe o número do protocolo.');
    const scope = await this.authService.buildTicketListWhere(actor);
    const found = await this.repository.findIdByProtocol(protocol, scope);
    if (!found) throw new NotFoundException('Nenhum chamado encontrado com este protocolo.');
    return this.getTicket(actor, found.id);
  }

  /** Chamado completo + historico (linha do tempo). Notas internas so para DEV. */
  async getTicket(actor: JwtUser, id: string) {
    const ticket: any = await this.loadTicket(actor, id);
    const includeInternal = actor.role === 'DEV';
    const messages = (ticket.messages ?? []).filter((message: any) => includeInternal || message.visibility !== 'INTERNAL');
    const events = (ticket.events ?? []).filter((event: any) => includeInternal || event.eventType !== 'INTERNAL_NOTE');
    const visible = { ...ticket, messages, events };
    return { ...visible, timeline: buildTimeline(visible, { includeInternal }) };
  }

  private async loadTicket(actor: JwtUser, id: string) {
    const isPlatformUser = actor.role === 'DEV' || actor.role === 'COMERCIAL';
    const ticket = isPlatformUser
      ? await this.repository.findPlatformTicketById(id)
      : await this.repository.findClientTicketById(id, actor.companyId);

    if (!ticket) throw new NotFoundException('Chamado não encontrado.');
    await this.authService.assertCanViewTicket(actor, ticket);
    return ticket;
  }

  async addMessage(actor: JwtUser, id: string, message: string, visibility: 'PUBLIC' | 'INTERNAL' = 'PUBLIC') {
    const ticket = await this.loadTicket(actor, id);
    if (visibility === 'INTERNAL') {
      this.authService.assertCanCreateInternalNote(actor);
    } else {
      await this.authService.assertCanReplyTicket(actor, ticket);
    }

    const msg = await this.repository.createMessage({
      ticketId: id,
      authorUserId: actor.sub,
      message,
      visibility,
      authorName: actor.name,
      authorEmail: actor.email
    });

    await this.repository.createEvent({
      ticketId: id,
      actorUserId: actor.sub,
      eventType: visibility === 'PUBLIC' ? 'PUBLIC_REPLY' : 'INTERNAL_NOTE',
    });

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

  async closeTicket(actor: JwtUser, id: string) {
    const ticket = await this.loadTicket(actor, id);
    await this.authService.assertCanCloseTicket(actor, ticket);

    await this.repository.updateTicket(id, {
      status: 'CLOSED',
      closedAt: new Date()
    });

    await this.repository.createEvent({
      ticketId: id,
      actorUserId: actor.sub,
      eventType: 'TICKET_CLOSED',
      previousValue: { status: ticket.status },
      newValue: { status: 'CLOSED' },
    });
  }

  async reopenTicket(actor: JwtUser, id: string) {
    const ticket = await this.loadTicket(actor, id);
    await this.authService.assertCanCloseTicket(actor, ticket);

    await this.repository.updateTicket(id, {
      status: 'IN_PROGRESS',
      closedAt: null,
      resolvedAt: null
    });

    await this.repository.createEvent({
      ticketId: id,
      actorUserId: actor.sub,
      eventType: 'TICKET_REOPENED',
      previousValue: { status: ticket.status },
      newValue: { status: 'IN_PROGRESS' },
    });
  }

  private serializeTicket(ticket: any) {
    const serializeAttachment = (attachment: any) => ({
      ...attachment,
      sizeBytes: Number(attachment.sizeBytes ?? 0),
    });
    return {
      ...ticket,
      attachments: (ticket.attachments ?? []).map(serializeAttachment),
      messages: (ticket.messages ?? []).map((message: any) => ({
        ...message,
        attachments: (message.attachments ?? []).map(serializeAttachment),
      })),
    };
  }
}
