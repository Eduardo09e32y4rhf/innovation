import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { InvalidMeetingLinkError, normalizeMeetingUrl } from '../../common/utils/meeting-link';
import { PrismaService } from '../../database/prisma.service';

/** Quem ve o que: RH - R&S so enxerga a propria agenda (o que criou ou o que esta sob sua responsabilidade). */
export type EventsActor = { sub: string; role: string };

const TEXT = (value: unknown, max: number) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim().slice(0, max);
  return text || null;
};

const EVENT_TYPES = new Set(['REUNIAO', 'CHAMADA', 'TAREFA_INTERNA', 'PRAZO_ADMINISTRATIVO', 'RETORNO_COLABORADOR', 'DOCUMENTO_PENDENTE', 'ENTREVISTA', 'OUTROS']);
const STATUSES = new Set(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']);
const PRIORITIES = new Set(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']);

function parseDate(value: unknown, field: string): Date {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`${field} inválida.`);
  return date;
}

/** So os campos do compromisso: companyId, createdBy e afins nunca vem do corpo da requisicao. */
export function pickEventData(body: Record<string, unknown>, mode: 'create' | 'update'): Prisma.ManagementEventUncheckedUpdateInput {
  const data: Record<string, unknown> = {};
  if (body.title !== undefined || mode === 'create') {
    const title = TEXT(body.title, 200);
    if (!title) throw new BadRequestException('Informe o título do compromisso.');
    data.title = title;
  }
  if (body.description !== undefined) data.description = TEXT(body.description, 4000);
  if (body.eventType !== undefined) {
    const type = String(body.eventType).toUpperCase();
    if (!EVENT_TYPES.has(type)) throw new BadRequestException('Tipo de compromisso inválido.');
    data.eventType = type;
  } else if (mode === 'create') data.eventType = 'REUNIAO';
  if (body.status !== undefined) {
    const status = String(body.status).toUpperCase();
    if (!STATUSES.has(status)) throw new BadRequestException('Status inválido.');
    data.status = status;
  }
  if (body.priority !== undefined) {
    const priority = String(body.priority).toUpperCase();
    if (!PRIORITIES.has(priority)) throw new BadRequestException('Prioridade inválida.');
    data.priority = priority;
  }
  if (body.startDateTime !== undefined || mode === 'create') data.startDateTime = parseDate(body.startDateTime, 'Data de início');
  if (body.endDateTime !== undefined) data.endDateTime = body.endDateTime ? parseDate(body.endDateTime, 'Data de fim') : null;
  if (data.startDateTime && data.endDateTime && (data.endDateTime as Date) < (data.startDateTime as Date)) throw new BadRequestException('O fim não pode ser antes do início.');
  if (body.responsibleUserId !== undefined) data.responsibleUserId = TEXT(body.responsibleUserId, 64);
  if (body.employeeId !== undefined) data.employeeId = TEXT(body.employeeId, 64);
  if (body.location !== undefined) data.location = TEXT(body.location, 300);
  if (body.meetingUrl !== undefined) {
    try { data.meetingUrl = normalizeMeetingUrl(body.meetingUrl); } catch (error) {
      if (error instanceof InvalidMeetingLinkError) throw new BadRequestException(error.message);
      throw error;
    }
  }
  return data as Prisma.ManagementEventUncheckedUpdateInput;
}

@Injectable()
export class ManagementEventsService {
  constructor(private readonly prisma: PrismaService) {}

  private scope(companyId: string, actor?: EventsActor): Prisma.ManagementEventWhereInput {
    if (actor?.role !== 'RH_RS') return { companyId };
    return { companyId, OR: [{ createdBy: actor.sub }, { responsibleUserId: actor.sub }] };
  }

  async list(companyId: string, actor?: EventsActor) {
    return this.prisma.managementEvent.findMany({
      where: this.scope(companyId, actor),
      orderBy: { startDateTime: 'desc' },
      include: { employee: { select: { id: true, name: true } } },
    });
  }

  async listByEmployee(companyId: string, employeeId: string) {
    return this.prisma.managementEvent.findMany({
      where: { companyId, employeeId },
      orderBy: { startDateTime: 'desc' },
    });
  }

  async find(companyId: string, id: string, actor?: EventsActor) {
    const r = await this.prisma.managementEvent.findFirst({
      where: { id, ...this.scope(companyId, actor) },
      include: { employee: { select: { id: true, name: true } } },
    });
    if (!r) throw new NotFoundException('Compromisso não encontrado.');
    return r;
  }

  async create(companyId: string, userId: string | undefined, body: Record<string, unknown>, actor?: EventsActor) {
    const data = pickEventData(body ?? {}, 'create') as Prisma.ManagementEventUncheckedCreateInput;
    // RH - R&S nao tem funcionarios vinculados nem agenda dos outros: o compromisso e dele.
    if (actor?.role === 'RH_RS') { data.employeeId = null; data.responsibleUserId = actor.sub; }
    if (data.employeeId) await this.assertEmployee(companyId, String(data.employeeId));
    return this.prisma.managementEvent.create({
      data: { ...data, companyId, createdBy: userId ?? null },
      include: { employee: { select: { id: true, name: true } } },
    });
  }

  async update(companyId: string, id: string, body: Record<string, unknown>, actor?: EventsActor) {
    await this.find(companyId, id, actor);
    const data = pickEventData(body ?? {}, 'update');
    if (actor?.role === 'RH_RS') { delete data.employeeId; delete data.responsibleUserId; }
    if (data.employeeId) await this.assertEmployee(companyId, String(data.employeeId));
    return this.prisma.managementEvent.update({
      where: { id },
      data,
      include: { employee: { select: { id: true, name: true } } },
    });
  }

  async delete(companyId: string, id: string, actor?: EventsActor) {
    await this.find(companyId, id, actor);
    await this.prisma.managementEvent.delete({ where: { id } });
    return { ok: true };
  }

  private async assertEmployee(companyId: string, employeeId: string) {
    const found = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId }, select: { id: true } });
    if (!found) throw new BadRequestException('Funcionário não encontrado nesta empresa.');
  }

  async kanban(companyId: string, actor?: EventsActor) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const events = await this.prisma.managementEvent.findMany({
      where: {
        AND: [
          this.scope(companyId, actor),
          { OR: [{ status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } }, { startDateTime: { gte: thirtyDaysAgo } }] },
        ],
      },
      orderBy: { startDateTime: 'asc' },
      include: { employee: { select: { id: true, name: true } } },
    });

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setUTCDate(endOfWeek.getUTCDate() + (5 - endOfWeek.getUTCDay() + 7) % 7 + 1);

    const columns: Record<'OVERDUE' | 'TODAY' | 'THIS_WEEK' | 'UPCOMING' | 'COMPLETED', typeof events> = {
      OVERDUE: [],
      TODAY: [],
      THIS_WEEK: [],
      UPCOMING: [],
      COMPLETED: [],
    };

    for (const ev of events) {
      if (ev.status === 'CONCLUIDO' || ev.status === 'CANCELADO') {
        columns.COMPLETED.push(ev);
        continue;
      }

      const start = new Date(ev.startDateTime);
      if (start < startOfToday) {
        columns.OVERDUE.push(ev);
      } else if (start >= startOfToday && start < endOfToday) {
        columns.TODAY.push(ev);
      } else if (start < endOfWeek) {
        columns.THIS_WEEK.push(ev);
      } else {
        columns.UPCOMING.push(ev);
      }
    }

    return columns;
  }
}
