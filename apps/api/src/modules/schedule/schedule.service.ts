import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { AssignScheduleDto } from './dto/assign-schedule.dto';
import { CreateScheduleExceptionDto } from './dto/swap-request.dto';

const CAN_WRITE = ['ADMIN', 'RH', 'DEV'];
const CAN_APPROVE = ['ADMIN', 'RH', 'GESTOR', 'DEV'];

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

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

    // Verifica existência da escala
    const schedule = await this.prisma.schedule.findFirst({ where: { id: dto.scheduleId, companyId } });
    if (!schedule) throw new NotFoundException('Escala não encontrada.');

    return this.prisma.$transaction(async (tx) => {
      // Encerra vigência anterior (se houver escala ativa sem endDate)
      await tx.userSchedule.updateMany({
        where: {
          employeeId: { in: dto.employeeIds },
          companyId,
          endDate: null,
        },
        data: { endDate: new Date(dto.startDate) },
      });

      // Cria a nova atribuição para cada funcionário
      const dataToInsert = dto.employeeIds.map(empId => ({
        companyId,
        employeeId: empId,
        scheduleId: dto.scheduleId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        entryTimeOverride: dto.entryTimeOverride,
        lunchStartTimeOverride: dto.lunchStartTimeOverride,
        lunchReturnTimeOverride: dto.lunchReturnTimeOverride,
        exitTimeOverride: dto.exitTimeOverride,
        assignedByUserId: actor.sub,
      }));

      await tx.userSchedule.createMany({ data: dataToInsert });
      return { success: true, count: dto.employeeIds.length };
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

    // Parse do mês
    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0);

    // Busca a escala vigente no período
    const userSchedule = await this.prisma.userSchedule.findFirst({
      where: {
        companyId,
        employeeId,
        startDate: { lte: endDate },
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
        date: { gte: startDate, lte: endDate },
      },
    });

    // Busca feriados
    const holidays = await this.prisma.holiday.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
      },
    });

    // Busca registros de ponto do mês
    const timeTracks = await this.prisma.timeTrack.findMany({
      where: {
        companyId,
        employeeId,
        date: { gte: startDate, lte: endDate },
      },
    });

    // Monta calendário dia a dia
    const days: any[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dateStr = cursor.toISOString().split('T')[0];
      const dow = cursor.getDay(); // 0=dom, 6=sab
      const exception = exceptions.find(
        (e: any) => e.date.toISOString().split('T')[0] === dateStr,
      );
      const holiday = holidays.find(
        (h: any) => (h.date as Date).toISOString().split('T')[0] === dateStr,
      );
      const timeTrack = timeTracks.find(
        (t: any) => (t.date as Date).toISOString().split('T')[0] === dateStr,
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

      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      employee: { id: employee.id, name: employee.name },
      schedule: userSchedule?.schedule ?? null,
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
      if (!self) return [];
      const team = await this.prisma.employee.findMany({
        where: { companyId, managerId: self.id, status: 'ACTIVE' },
        select: { id: true },
      });
      employeeIds = team.map((e: any) => e.id);
    } else if (['ADMIN', 'RH', 'DEV'].includes(actor.role)) {
      const all = await this.prisma.employee.findMany({
        where: { companyId, status: 'ACTIVE' },
        select: { id: true },
      });
      employeeIds = all.map((e: any) => e.id);
    } else {
      throw new ForbiddenException('Acesso negado.');
    }

    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0);

    const userSchedules = await this.prisma.userSchedule.findMany({
      where: {
        companyId,
        employeeId: { in: employeeIds },
        startDate: { lte: endDate },
        OR: [{ endDate: null }, { endDate: { gte: startDate } }],
      },
      include: {
        schedule: true,
        employee: { select: { id: true, name: true, department: true, position: true, registration: true } },
      },
      orderBy: [{ employee: { name: 'asc' } }],
    });

    // Adiciona funcionários sem escala vinculada
    const withSchedule = new Set(userSchedules.map((us) => us.employeeId));
    const withoutSchedule = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds.filter((id) => !withSchedule.has(id)) } },
      select: { id: true, name: true, department: true, position: true, registration: true },
    });

    return {
      withSchedule: userSchedules,
      withoutSchedule,
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

    return this.prisma.scheduleException.upsert({
      where: {
        employeeId_date_exceptionType: {
          employeeId: dto.employeeId,
          date: new Date(dto.date),
          exceptionType: dto.exceptionType,
        },
      },
      create: {
        companyId,
        employeeId: dto.employeeId,
        date: new Date(dto.date),
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

