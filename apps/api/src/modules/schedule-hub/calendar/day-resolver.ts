import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export type DayType = 'TRABALHO' | 'FOLGA' | 'FERIADO' | 'FERIAS' | 'ATESTADO' | 'SUSPENSAO' | 'COMPENSACAO' | 'FERIADO_LOCAL' | 'AJUSTE_ESCALA' | 'SEM_ESCALA';

export interface ResolvedDay {
  date: string;
  dayOfWeek: number;
  type: DayType;
  working: boolean;
  entry: string | null;
  lunchStart: string | null;
  lunchReturn: string | null;
  exit: string | null;
  scheduleId: string | null;
  scheduleName: string | null;
  exceptionType: string | null;
  exceptionReason: string | null;
  holidayName: string | null;
}

export const dateKey = (date: Date) => date.toISOString().slice(0, 10);
export const parseDateOnly = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00.000Z`);

export function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 1440;
  return diff;
}

export function scheduledMinutes(day: Pick<ResolvedDay, 'entry' | 'lunchStart' | 'lunchReturn' | 'exit'>) {
  if (!day.entry || !day.exit) return 0;
  const total = minutesBetween(day.entry, day.exit);
  const lunch = day.lunchStart && day.lunchReturn ? minutesBetween(day.lunchStart, day.lunchReturn) : 0;
  return Math.max(0, total - lunch);
}

interface Loaded {
  assignments: any[];
  exceptions: any[];
  holidays: any[];
  vacations: { employeeId: string; startDate: Date; endDate: Date }[];
}

/** Resolve a escala efetiva (única fonte de verdade) de funcionários para um intervalo de datas (date-only, UTC). */
@Injectable()
export class DayResolver {
  constructor(private readonly prisma: PrismaService) {}

  private async load(companyId: string, employeeIds: string[], from: Date, to: Date): Promise<Loaded> {
    const [assignments, exceptions, holidays, vacations] = await Promise.all([
      this.prisma.userSchedule.findMany({
        where: { companyId, employeeId: { in: employeeIds }, startDate: { lte: to }, OR: [{ endDate: null }, { endDate: { gte: from } }] },
        include: { schedule: true },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.scheduleException.findMany({ where: { companyId, employeeId: { in: employeeIds }, date: { gte: from, lte: to } } }),
      this.prisma.holiday.findMany({ where: { OR: [{ companyId }, { companyId: null }], date: { gte: from, lte: to } } }),
      this.prisma.vacation.findMany({
        where: { employeeId: { in: employeeIds }, status: { in: ['APPROVED', 'COMPLETED'] }, startDate: { lte: to }, endDate: { gte: from } },
        select: { employeeId: true, startDate: true, endDate: true },
      }),
    ]);
    return { assignments, exceptions, holidays, vacations };
  }

  private compute(employeeId: string, data: Loaded, from: Date, to: Date): ResolvedDay[] {
    const assignments = data.assignments.filter((item) => item.employeeId === employeeId);
    const exceptionByDate = new Map<string, any[]>();
    for (const item of data.exceptions) {
      if (item.employeeId !== employeeId) continue;
      const key = dateKey(item.date);
      exceptionByDate.set(key, [...(exceptionByDate.get(key) ?? []), item]);
    }
    const holidayByDate = new Map(data.holidays.map((item) => [dateKey(item.date), item]));
    const vacations = data.vacations.filter((item) => item.employeeId === employeeId);

    const days: ResolvedDay[] = [];
    for (let cursor = new Date(from); cursor <= to; cursor = new Date(cursor.getTime() + 86_400_000)) {
      const key = dateKey(cursor);
      const dow = cursor.getUTCDay();
      const assignment = assignments.find((item) => item.startDate <= cursor && (!item.endDate || item.endDate >= cursor));
      const schedule = assignment?.schedule ?? null;
      const exceptionList = exceptionByDate.get(key) ?? [];
      const exception = exceptionList.find((item) => item.exceptionType === 'COMPENSACAO') ?? exceptionList[0] ?? null;
      const holiday = holidayByDate.get(key) ?? null;
      const onVacation = vacations.some((vacation) => vacation.startDate <= cursor && vacation.endDate >= cursor);

      let entry: string | null = assignment?.entryTimeOverride ?? schedule?.entryTime ?? null;
      let lunchStart: string | null = assignment?.lunchStartTimeOverride ?? schedule?.lunchStartTime ?? null;
      let lunchReturn: string | null = assignment?.lunchReturnTimeOverride ?? schedule?.lunchReturnTime ?? null;
      let exit: string | null = assignment?.exitTimeOverride ?? schedule?.exitTime ?? null;

      let type: DayType = 'TRABALHO';
      if (!schedule) type = 'SEM_ESCALA';
      else if (schedule.scaleType === '12x36' && schedule.cycleStartDate) {
        const elapsed = Math.floor((cursor.getTime() - schedule.cycleStartDate.getTime()) / 86_400_000);
        if (Math.abs(elapsed) % 2 === 1) type = 'FOLGA';
      } else if (schedule.restDays.includes(dow)) type = 'FOLGA';

      if (type === 'TRABALHO' && holiday) type = 'FERIADO';

      if (exception) {
        if (exception.exceptionType === 'COMPENSACAO') {
          type = 'COMPENSACAO';
          entry = exception.altEntryTime ?? entry;
          exit = exception.altExitTime ?? exit;
        } else {
          type = (['FOLGA', 'ATESTADO', 'SUSPENSAO', 'FERIADO_LOCAL', 'AJUSTE_ESCALA'].includes(exception.exceptionType) ? exception.exceptionType : 'FOLGA') as DayType;
        }
      } else if (onVacation) {
        type = 'FERIAS';
      }

      const working = type === 'TRABALHO' || type === 'COMPENSACAO';
      if (!working) { entry = null; exit = null; lunchStart = null; lunchReturn = null; }

      days.push({
        date: key, dayOfWeek: dow, type, working, entry, lunchStart, lunchReturn, exit,
        scheduleId: schedule?.id ?? null, scheduleName: schedule?.name ?? null,
        exceptionType: exception?.exceptionType ?? null, exceptionReason: exception?.reason ?? null,
        holidayName: holiday?.name ?? null,
      });
    }
    return days;
  }

  async resolveMany(companyId: string, employeeIds: string[], from: Date, to: Date): Promise<Map<string, ResolvedDay[]>> {
    const result = new Map<string, ResolvedDay[]>();
    if (!employeeIds.length) return result;
    const data = await this.load(companyId, employeeIds, from, to);
    for (const id of employeeIds) result.set(id, this.compute(id, data, from, to));
    return result;
  }

  async resolveRange(companyId: string, employeeId: string, from: Date, to: Date): Promise<ResolvedDay[]> {
    return (await this.resolveMany(companyId, [employeeId], from, to)).get(employeeId) ?? [];
  }

  async resolveDay(companyId: string, employeeId: string, date: Date): Promise<ResolvedDay> {
    return (await this.resolveRange(companyId, employeeId, date, date))[0];
  }
}
