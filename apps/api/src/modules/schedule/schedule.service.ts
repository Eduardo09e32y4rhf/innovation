import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { saoPauloDayOfWeek, toSaoPauloDateKey } from '../../common/utils/date.utils';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { AssignScheduleDto } from './dto/assign-schedule.dto';
import { CreateScheduleExceptionDto } from './dto/swap-request.dto';

const CAN_WRITE = ['ADMIN', 'RH', 'DEV'];
const CAN_APPROVE = ['ADMIN', 'RH', 'GESTOR', 'DEV'];

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private monthBounds(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('Mes invalido. Use YYYY-MM.');
    const [year, value] = month.split('-').map(Number);
    if (value < 1 || value > 12) throw new BadRequestException('Mes invalido. Use YYYY-MM.');
    return {
      start: new Date(Date.UTC(year, value - 1, 1)),
      end: new Date(Date.UTC(year, value, 1)),
    };
  }

  // ─── Helpers de permissão ────────────────────────────────────────────────

  private assertCanWrite(actor: JwtUser) {
    if (!CAN_WRITE.includes(actor.role)) {
      throw new ForbiddenException('Apenas RH, Admin ou Dev podem criar/editar escalas.');
    }
  }

  // ─── Escalas (Templates) ─────────────────────────────────────────────────

  async listSchedules(companyId: string) {
    return this.prisma.schedule.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSchedule(companyId: string, id: string) {
    const s = await this.prisma.schedule.findFirst({ where: { id, companyId } });
    if (!s) throw new NotFoundException('Escala não encontrada.');
    return s;
  }

  async createSchedule(companyId: string, actor: JwtUser, dto: CreateScheduleDto) {
    this.assertCanWrite(actor);
    return this.prisma.schedule.create({
      data: {
        companyId,
        ...dto,
        createdByUserId: actor.sub,
        workDays: dto.workDays ?? [1, 2, 3, 4, 5],
        restDays: dto.restDays ?? [0, 6],
      },
    });
  }

  async updateSchedule(companyId: string, actor: JwtUser, id: string, dto: Partial<CreateScheduleDto>) {
    this.assertCanWrite(actor);
    await this.getSchedule(companyId, id);
    return this.prisma.schedule.update({ where: { id }, data: dto });
  }

  async archiveSchedule(companyId: string, actor: JwtUser, id: string) {
    this.assertCanWrite(actor);
    await this.getSchedule(companyId, id);
    return this.prisma.schedule.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  // ─── Atribuição de escala a funcionário ─────────────────────────────────

  async assignSchedule(companyId: string, actor: JwtUser, dto: AssignScheduleDto) {
    this.assertCanWrite(actor);

    const employeeIds = [...new Set(dto.employeeIds)];
    if (!employeeIds.length) throw new BadRequestException('Selecione pelo menos um funcionario.');

    const startDate = new Date(`${dto.startDate.slice(0, 10)}T00:00:00.000Z`);
    const endDate = dto.endDate
      ? new Date(`${dto.endDate.slice(0, 10)}T00:00:00.000Z`)
      : null;
    if (Number.isNaN(startDate.getTime()) || (endDate && Number.isNaN(endDate.getTime()))) {
      throw new BadRequestException('Data de vigencia invalida.');
    }
    if (endDate && endDate < startDate) {
      throw new BadRequestException('O fim da vigencia nao pode ser anterior ao inicio.');
    }

    // Verifica existência da escala
    const schedule = await this.prisma.schedule.findFirst({ where: { id: dto.scheduleId, companyId } });
    if (!schedule) throw new NotFoundException('Escala não encontrada.');

    return this.prisma.$transaction(async (tx) => {
      const employees = await tx.employee.findMany({
        where: { companyId, id: { in: employeeIds } },
        select: { id: true },
      });
      if (employees.length !== employeeIds.length) {
        throw new BadRequestException('Um ou mais funcionarios nao pertencem a esta empresa.');
      }

      const previousEndDate = new Date(startDate);
      previousEndDate.setUTCDate(previousEndDate.getUTCDate() - 1);

      await tx.userSchedule.deleteMany({
        where: { companyId, employeeId: { in: employeeIds }, startDate },
      });
      // Encerra vigência anterior (se houver escala ativa sem endDate)
      await tx.userSchedule.updateMany({
        where: {
          employeeId: { in: employeeIds },
          companyId,
          endDate: null,
          startDate: { lt: startDate },
        },
        data: { endDate: previousEndDate },
      });

      // Cria a nova atribuição para cada funcionário
      const dataToInsert = employeeIds.map(empId => ({
        companyId,
        employeeId: empId,
        scheduleId: dto.scheduleId,
        startDate,
        endDate,
        entryTimeOverride: dto.entryTimeOverride,
        lunchStartTimeOverride: dto.lunchStartTimeOverride,
        lunchReturnTimeOverride: dto.lunchReturnTimeOverride,
        exitTimeOverride: dto.exitTimeOverride,
        assignedByUserId: actor.sub,
      }));

      await tx.userSchedule.createMany({ data: dataToInsert });
      return { success: true, count: employeeIds.length };
    });
  }

  // ─── Minha Escala ─────────────────────────────────────────────────────────

  async getMySchedule(companyId: string, actor: JwtUser) {
    const employee = await this.prisma.employee.findFirst({
      where: { companyId, userId: actor.sub },
    });
    if (!employee) return null;

    const today = new Date();
    const userSchedule = await this.prisma.userSchedule.findFirst({
      where: {
        companyId,
        employeeId: employee.id,
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      include: { schedule: true },
      orderBy: { startDate: 'desc' },
    });

    return { employee, userSchedule };
  }

  // ─── Calendário mensal ────────────────────────────────────────────────────

  async getCalendar(companyId: string, actor: JwtUser, employeeId: string, month: string) {
    // Verifica acesso
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');

    // Apenas o próprio funcionário, seu gestor, RH, Admin ou Dev podem ver
    if (actor.role === 'FUNCIONARIO') {
      const self = await this.prisma.employee.findFirst({ where: { companyId, userId: actor.sub } });
      if (!self || self.id !== employeeId) {
        throw new ForbiddenException('Acesso negado.');
      }
    }

    if (actor.role === 'GESTOR') {
      const manager = await this.prisma.employee.findFirst({ where: { companyId, userId: actor.sub } });
      if (!manager || (employee.id !== manager.id && employee.managerId !== manager.id)) {
        throw new ForbiddenException('Acesso negado.');
      }
    }

    const { start: startDate, end: endDate } = this.monthBounds(month);

    // Uma escala pode mudar no meio do mes; cada dia usa sua vigencia real.
    const userSchedules = await this.prisma.userSchedule.findMany({
      where: {
        companyId,
        employeeId,
        startDate: { lt: endDate },
        OR: [{ endDate: null }, { endDate: { gte: startDate } }],
      },
      include: { schedule: true },
      orderBy: { startDate: 'desc' },
    });

    // Busca exceções do mês
    const exceptions = await this.prisma.scheduleException.findMany({
      where: {
        companyId,
        employeeId,
        date: { gte: startDate, lt: endDate },
      },
    });

    // Busca feriados
    const holidays = await this.prisma.holiday.findMany({
      where: {
        companyId,
        date: { gte: startDate, lt: endDate },
      },
    });

    // Busca registros de ponto do mês
    const timeTracks = await this.prisma.timeTrack.findMany({
      where: {
        companyId,
        employeeId,
        date: { gte: startDate, lt: endDate },
      },
    });

    // Monta calendário dia a dia
    const days: any[] = [];
    const cursor = new Date(startDate);
    while (cursor < endDate) {
      const dateStr = toSaoPauloDateKey(cursor);
      const dow = saoPauloDayOfWeek(cursor); // 0=dom, 6=sab
      const userSchedule = userSchedules.find((item) =>
        item.startDate <= cursor && (!item.endDate || item.endDate >= cursor)
      );
      const exception = exceptions.find(
        (e: any) => toSaoPauloDateKey(e.date) === dateStr,
      );
      const holiday = holidays.find(
        (h: any) => toSaoPauloDateKey(h.date as Date) === dateStr,
      );
      const timeTrack = timeTracks.find(
        (t: any) => toSaoPauloDateKey(t.date as Date) === dateStr,
      );

      let dayType: string = 'WORK';
      let entry = userSchedule?.entryTimeOverride ?? userSchedule?.schedule?.entryTime;
      let lunchStart = userSchedule?.lunchStartTimeOverride ?? userSchedule?.schedule?.lunchStartTime;
      let lunchReturn = userSchedule?.lunchReturnTimeOverride ?? userSchedule?.schedule?.lunchReturnTime;
      let exit = userSchedule?.exitTimeOverride ?? userSchedule?.schedule?.exitTime;

      if (exception) {
        dayType = exception.exceptionType;
        if (exception.exceptionType === 'COMPENSACAO') {
          entry = exception.altEntryTime ?? entry;
          exit = exception.altExitTime ?? exit;
        } else {
          entry = null;
          exit = null;
          lunchStart = null;
          lunchReturn = null;
        }
      } else if (holiday) {
        dayType = 'FERIADO';
        entry = null;
        exit = null;
        lunchStart = null;
        lunchReturn = null;
      } else if (
        userSchedule &&
        userSchedule.schedule.restDays.includes(dow)
      ) {
        dayType = 'FOLGA';
        entry = null;
        exit = null;
        lunchStart = null;
        lunchReturn = null;
      } else if (!userSchedule) {
        dayType = 'SEM_ESCALA';
      }

      days.push({
        date: dateStr,
        dayOfWeek: dow,
        dayType,
        scheduled: { entry, lunchStart, lunchReturn, exit },
        actual: timeTrack
          ? {
              // ── Batidas de ponto ──────────────────────────────────────────
              entry: timeTrack.entry,
              lunchStart: timeTrack.lunchStart,
              lunchReturn: timeTrack.lunchReturn,
              exit: timeTrack.exit,
              // ── Totais calculados ─────────────────────────────────────────
              totalWorked: timeTrack.totalWorked,
              dailyBalance: timeTrack.dailyBalance,
              // ── Ocorrências e incidentes ──────────────────────────────────
              incidentType: timeTrack.incidentType,
              lateMinutes: timeTrack.lateMinutes,
              earlyLeaveMinutes: timeTrack.earlyLeaveMinutes,
              absenceMinutes: timeTrack.absenceMinutes,
              // ── Hora Extra ────────────────────────────────────────────────
              overtime50Minutes: timeTrack.overtime50Minutes,
              overtime100Minutes: timeTrack.overtime100Minutes,
              nightShiftMinutes: timeTrack.nightShiftMinutes,
              overtimeApprovalStatus: timeTrack.overtimeApprovalStatus,
              overtimeExceedsLimit: timeTrack.overtimeExceedsLimit,
              overtimeHandling: timeTrack.overtimeHandling,
              overtimeBankMinutes: timeTrack.overtimeBankMinutes,
              overtimePaymentMinutes: timeTrack.overtimePaymentMinutes,
              // ── Ajuste manual ─────────────────────────────────────────────
              observation: timeTrack.observation,
              manualReason: timeTrack.manualReason,
              manualStatus: timeTrack.manualStatus,
              // ── Localização ───────────────────────────────────────────────
              latitude: timeTrack.latitude,
              longitude: timeTrack.longitude,
              clockedInWithoutFacial: timeTrack.clockedInWithoutFacial ?? false,
            }
          : null,
        exception: exception ?? null,
        holiday: holiday ? { name: (holiday as any).name, date: dateStr } : null,
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return {
      employee: { id: employee.id, name: employee.name },
      schedule: userSchedules[0]?.schedule ?? null,
      month,
      days,
    };
  }

  // ─── Escala de equipe ─────────────────────────────────────────────────────

  async getTeamSchedule(companyId: string, actor: JwtUser, month: string) {
    let employeeIds: string[] = [];

    if (actor.role === 'GESTOR') {
      const self = await this.prisma.employee.findFirst({
        where: { companyId, userId: actor.sub },
      });
      if (!self) return { withSchedule: [], withoutSchedule: [], calendars: [], month };
      const team = await this.prisma.employee.findMany({
        where: { companyId, managerId: self.id, status: 'ACTIVE' },
        select: { id: true },
      });
      employeeIds = [self.id, ...team.map((e: any) => e.id)];
    } else if (['ADMIN', 'RH', 'DEV'].includes(actor.role)) {
      const all = await this.prisma.employee.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          ...(actor.role === 'DEV' ? {} : {
            OR: [{ user: null }, { user: { role: { not: 'DEV' } } }],
          }),
        },
        select: { id: true },
      });
      employeeIds = all.map((e: any) => e.id);
    } else {
      throw new ForbiddenException('Acesso negado.');
    }

    const { start: startDate, end: endDate } = this.monthBounds(month);

    const userSchedules = await this.prisma.userSchedule.findMany({
      where: {
        companyId,
        employeeId: { in: employeeIds },
        startDate: { lt: endDate },
        OR: [{ endDate: null }, { endDate: { gte: startDate } }],
      },
      include: {
        schedule: true,
        employee: { select: { id: true, name: true, department: true, position: true, registration: true } },
      },
      orderBy: [{ employee: { name: 'asc' } }],
    });

    // Adiciona funcionários sem escala vinculada e deduplica
    const withScheduleMap = new Map();
    for (const us of userSchedules) {
      if (!withScheduleMap.has(us.employeeId)) {
        withScheduleMap.set(us.employeeId, us);
      }
    }
    const uniqueUserSchedules = Array.from(withScheduleMap.values());
    const withScheduleIds = new Set(withScheduleMap.keys());

    const withoutSchedule = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds.filter((id) => !withScheduleIds.has(id)) } },
      select: { id: true, name: true, department: true, position: true, registration: true },
    });

    const calendars = await Promise.all(employeeIds.map((employeeId) =>
      this.getCalendar(companyId, actor, employeeId, month)
    ));
    const calendarByEmployee = new Map(calendars.map((calendar) => [calendar.employee.id, calendar]));
    const withSchedule = uniqueUserSchedules.map((assignment: any) => ({
      ...assignment,
      days: calendarByEmployee.get(assignment.employeeId)?.days ?? [],
    }));

    return {
      withSchedule,
      withoutSchedule,
      calendars,
      month,
    };
  }

  // ─── Exceções de Escala ───────────────────────────────────────────────────

  async createException(companyId: string, actor: JwtUser, dto: CreateScheduleExceptionDto) {
    if (!CAN_WRITE.includes(actor.role)) {
      throw new ForbiddenException('Apenas RH, Admin ou Dev podem criar exceções.');
    }
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');

    const exceptionDate = new Date(`${dto.date.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(exceptionDate.getTime())) throw new BadRequestException('Data invalida.');

    return this.prisma.scheduleException.upsert({
      where: {
        employeeId_date_exceptionType: {
          employeeId: dto.employeeId,
          date: exceptionDate,
          exceptionType: dto.exceptionType,
        },
      },
      create: {
        companyId,
        employeeId: dto.employeeId,
        date: exceptionDate,
        exceptionType: dto.exceptionType,
        reason: dto.reason,
        observation: dto.observation,
        altEntryTime: dto.altEntryTime,
        altExitTime: dto.altExitTime,
        createdByUserId: actor.sub,
      },
      update: {
        reason: dto.reason,
        observation: dto.observation,
        altEntryTime: dto.altEntryTime,
        altExitTime: dto.altExitTime,
      },
    });
  }

  async deleteException(companyId: string, actor: JwtUser, id: string) {
    if (!CAN_WRITE.includes(actor.role)) {
      throw new ForbiddenException('Acesso negado.');
    }
    await this.prisma.scheduleException.deleteMany({ where: { id, companyId } });
    return { ok: true };
  }

  // ─── Busca escala ativa de um funcionário (usado pelo Ponto) ─────────────

  async getActiveScheduleForEmployee(companyId: string, employeeId: string, date: Date) {
    return this.prisma.userSchedule.findFirst({
      where: {
        companyId,
        employeeId,
        startDate: { lte: date },
        OR: [{ endDate: null }, { endDate: { gte: date } }],
      },
      include: { schedule: true },
      orderBy: { startDate: 'desc' },
    });
  }

  // ─── Calendário do usuário logado ────────────────────────────────────────

  async getMyCalendar(companyId: string, actor: JwtUser, month: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { companyId, userId: actor.sub },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado para este usuário.');
    return this.getCalendar(companyId, actor, employee.id, month);
  }
}

