import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ManagementEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    return this.prisma.managementEvent.findMany({
      where: { companyId },
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

  async find(companyId: string, id: string) {
    const r = await this.prisma.managementEvent.findFirst({
      where: { id, companyId },
      include: { employee: { select: { id: true, name: true } } },
    });
    if (!r) throw new Error('NÃO ENCONTRADO');
    return r;
  }

  async create(companyId: string, userId: string | undefined, data: any) {
    return this.prisma.managementEvent.create({
      data: {
        companyId,
        createdBy: userId,
        ...data,
        startDateTime: new Date(data.startDateTime),
        endDateTime: data.endDateTime ? new Date(data.endDateTime) : undefined,
      },
      include: { employee: { select: { id: true, name: true } } },
    });
  }

  async update(companyId: string, id: string, data: any) {
    const r = await this.prisma.managementEvent.findFirst({ where: { id, companyId } });
    if (!r) throw new Error('NÃO ENCONTRADO');
    return this.prisma.managementEvent.update({
      where: { id },
      data: {
        ...data,
        startDateTime: data.startDateTime ? new Date(data.startDateTime) : undefined,
        endDateTime: data.endDateTime ? new Date(data.endDateTime) : undefined,
      },
      include: { employee: { select: { id: true, name: true } } },
    });
  }

  async delete(companyId: string, id: string) {
    const r = await this.prisma.managementEvent.findFirst({ where: { id, companyId } });
    if (!r) throw new Error('NÃO ENCONTRADO');
    await this.prisma.managementEvent.delete({ where: { id } });
    return { ok: true };
  }

  async kanban(companyId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const events = await this.prisma.managementEvent.findMany({
      where: { 
        companyId,
        OR: [
          { status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } },
          { startDateTime: { gte: thirtyDaysAgo } }
        ]
      },
      orderBy: { startDateTime: 'asc' },
      include: { employee: { select: { id: true, name: true } } },
    });

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setUTCDate(endOfWeek.getUTCDate() + (5 - endOfWeek.getUTCDay() + 7) % 7 + 1);

    const columns: any = {
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