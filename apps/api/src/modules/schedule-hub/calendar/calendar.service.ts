import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { bankBalanceOf } from '../../time-track/overtime-policy';
import { occurrenceLabel } from '../../time-track/occurrence-label';
import type { JwtUser } from '../../../common/types/auth.types';
import { toDateOnly } from '../../../common/utils/date.utils';
import { scopeOf } from '../../schedule/access/schedule-access';
import { ScheduleScopeService } from '../../schedule/access/schedule-scope.service';
import { DayResolver, dateKey, parseDateOnly, scheduledMinutes, type ResolvedDay } from './day-resolver';

const fmt = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined) return '—';
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, '0')}`;
};

export function monthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('Mes invalido. Use YYYY-MM.');
  const [year, value] = month.split('-').map(Number);
  if (value < 1 || value > 12) throw new BadRequestException('Mes invalido. Use YYYY-MM.');
  return { from: new Date(Date.UTC(year, value - 1, 1)), to: new Date(Date.UTC(year, value, 0)) };
}

export function dayStatus(day: ResolvedDay, track: any | undefined, today: string): 'OK' | 'FALTA' | 'ATRASO' | 'PENDENTE' | 'ANDAMENTO' | null {
  if (track?.manualStatus === 'pending') return 'PENDENTE';
  if (!day.working) return null;
  if (!track?.entry) return day.date < today ? 'FALTA' : null;
  if (!track.exit) return day.date < today ? 'PENDENTE' : 'ANDAMENTO';
  return (track.lateMinutes ?? 0) > 0 ? 'ATRASO' : 'OK';
}

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScheduleScopeService,
    private readonly days: DayResolver,
  ) {}

  private async visibleEmployees(actor: JwtUser, scopeParam: string, department?: string) {
    const allowed = await this.scope.allowedEmployeeIds(actor, 'calendar.read');
    const me = await this.scope.employeeOf(actor);
    const where: any = { companyId: actor.companyId, status: { in: ['ACTIVE', 'ONBOARDING'] } };
    if (scopeParam === 'me') where.id = me?.id ?? '00000000-0000-0000-0000-000000000000';
    else if (scopeParam === 'team') where.OR = [{ managerId: me?.id ?? '00000000-0000-0000-0000-000000000000' }, ...(me ? [{ id: me.id }] : [])];
    if (allowed !== null) where.id = where.id ? { in: allowed.filter((id) => id === where.id) } : { in: allowed };
    if (department) where.department = department;
    return this.prisma.employee.findMany({ where, select: { id: true, name: true, department: true, position: true }, orderBy: { name: 'asc' }, take: 300 });
  }

  async calendar(actor: JwtUser, month: string, scopeParam: string, department?: string) {
    const { from, to } = monthRange(month);
    const employees = await this.visibleEmployees(actor, scopeParam, department);
    const ids = employees.map((employee) => employee.id);
    const [resolved, tracks] = await Promise.all([
      this.days.resolveMany(actor.companyId, ids, from, to),
      this.prisma.timeTrack.findMany({ where: { companyId: actor.companyId, employeeId: { in: ids }, date: { gte: from, lte: to } } }),
    ]);
    const trackMap = new Map(tracks.map((track) => [`${track.employeeId}|${dateKey(track.date)}`, track]));
    const today = dateKey(toDateOnly(new Date()));
    const dates: string[] = [];
    for (let cursor = new Date(from); cursor <= to; cursor = new Date(cursor.getTime() + 86_400_000)) dates.push(dateKey(cursor));

    return {
      month,
      today,
      dates,
      employees: employees.map((employee) => {
        const rows = resolved.get(employee.id) ?? [];
        return {
          ...employee,
          days: rows.map((day) => {
            const track = trackMap.get(`${employee.id}|${day.date}`);
            return { type: day.type, entry: day.entry, exit: day.exit, status: dayStatus(day, track, today), holiday: day.holidayName, schedule: day.scheduleName };
          }),
        };
      }),
    };
  }

  /** Detalhe de um dia: escala esperada, batidas (com localização conforme o perfil), cálculo explicado, ocorrências e solicitações. */
  async day(actor: JwtUser, employeeId: string, date: string) {
    await this.scope.assertEmployee(actor, 'calendar.read', employeeId);
    const when = parseDateOnly(date);
    const me = await this.scope.employeeOf(actor);
    const full = me?.id === employeeId || scopeOf(actor.role, 'closing.write') === 'company';

    const [resolved, track, events, occurrences, requests, employee] = await Promise.all([
      this.days.resolveDay(actor.companyId, employeeId, when),
      this.prisma.timeTrack.findFirst({ where: { companyId: actor.companyId, employeeId, date: when } }),
      this.prisma.punchEvent.findMany({ where: { companyId: actor.companyId, employeeId, workDate: when }, orderBy: { occurredAt: 'asc' } }),
      this.prisma.timeOccurrence.findMany({ where: { companyId: actor.companyId, employeeId, date: when }, orderBy: { createdAt: 'asc' } }),
      this.prisma.scheduleRequest.findMany({ where: { companyId: actor.companyId, OR: [{ requesterEmployeeId: employeeId }, { peerEmployeeId: employeeId }], status: { in: ['PENDING', 'AWAITING_PEER', 'APPROVED'] } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, name: true, department: true } }),
    ]);

    const expected = scheduledMinutes(resolved);
    const explain: { label: string; value: string; hint?: string }[] = [];
    explain.push({ label: 'Escala do dia', value: resolved.working ? `${resolved.entry}–${resolved.exit}` : labelType(resolved.type), hint: resolved.scheduleName ?? undefined });
    if (resolved.working) explain.push({ label: 'Jornada prevista', value: fmt(expected) });
    if (track) {
      explain.push({ label: 'Trabalhado', value: fmt(track.totalWorked) });
      explain.push({ label: 'Saldo do dia', value: fmt(track.dailyBalance), hint: (track.dailyBalance ?? 0) >= 0 ? 'Credito no banco de horas ou hora extra.' : 'Debito: trabalhou menos que o previsto.' });
      if (track.lateMinutes) explain.push({ label: 'Atraso', value: fmt(track.lateMinutes), hint: 'Acima da tolerancia da regra de ponto.' });
      if (track.earlyLeaveMinutes) explain.push({ label: 'Saida antecipada', value: fmt(track.earlyLeaveMinutes) });
      if (track.overtime50Minutes) explain.push({ label: 'Hora extra 50%', value: fmt(track.overtime50Minutes), hint: 'Dia util, acima da jornada.' });
      if (track.overtime100Minutes) explain.push({ label: 'Hora extra 100%', value: fmt(track.overtime100Minutes), hint: 'Domingo, folga ou feriado trabalhado.' });
      if (track.nightShiftMinutes) explain.push({ label: 'Adicional noturno', value: fmt(track.nightShiftMinutes), hint: 'Trabalho entre 22h e 5h.' });
      if (track.absenceMinutes) explain.push({ label: 'Falta', value: fmt(track.absenceMinutes) });
    } else if (resolved.working && date < dateKey(toDateOnly(new Date()))) {
      explain.push({ label: 'Sem registro', value: 'Falta', hint: 'Nenhuma batida encontrada. Envie uma justificativa ou ajuste.' });
    }

    const isPastWorkingDay = resolved.working && date < dateKey(toDateOnly(new Date()));
    // Texto automatico: o funcionario ve o que o sistema validou do dia, sem precisar descrever.
    const occurrence = !track && isPastWorkingDay ? 'Falta integral' : resolved.working || track ? occurrenceLabel(track) : 'Sem ocorrência';

    return {
      employee,
      date,
      occurrence,
      scheduled: resolved,
      track: track && { entry: track.entry, lunchStart: track.lunchStart, lunchReturn: track.lunchReturn, exit: track.exit, totalWorked: track.totalWorked, dailyBalance: track.dailyBalance, manualStatus: track.manualStatus, overtimeApprovalStatus: track.overtimeApprovalStatus, incidentType: track.incidentType },
      events: events.map((event) => ({
        id: event.id, type: event.type, origin: event.origin, occurredAt: event.occurredAt, withinFence: event.withinFence,
        distanceMeters: event.distanceMeters, flags: event.flags, justification: event.justification, receipt: event.receipt,
        ...(full ? { latitude: event.latitude, longitude: event.longitude, accuracyMeters: event.accuracyMeters, address: event.address } : {}),
      })),
      occurrences: occurrences.map((item) => ({ id: item.id, type: item.type, minutes: item.minutes, status: item.status, reason: item.reason })),
      requests: requests.filter((request) => JSON.stringify(request.payload).includes(date)).map((request) => ({ id: request.id, type: request.type, status: request.status })),
      explain,
    };
  }

  /** Espelho do mês de um funcionário. */
  async timesheet(actor: JwtUser, employeeId: string, month: string) {
    await this.scope.assertEmployee(actor, 'calendar.read', employeeId);
    const { from, to } = monthRange(month);
    const [resolved, tracks, closing, bank, employee] = await Promise.all([
      this.days.resolveRange(actor.companyId, employeeId, from, to),
      this.prisma.timeTrack.findMany({ where: { companyId: actor.companyId, employeeId, date: { gte: from, lte: to } } }),
      this.prisma.timeClosing.findFirst({ where: { companyId: actor.companyId, employeeId, periodStart: { lte: to }, periodEnd: { gte: from } }, select: { id: true, status: true } }),
      bankBalanceOf(this.prisma, actor.companyId, employeeId).then((balanceMinutes) => ({ balanceMinutes })),
      this.prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, name: true, department: true, position: true } }),
    ]);
    const trackMap = new Map(tracks.map((track) => [dateKey(track.date), track]));
    const today = dateKey(toDateOnly(new Date()));
    const rows = resolved.map((day) => {
      const track = trackMap.get(day.date);
      return {
        date: day.date, dayOfWeek: day.dayOfWeek, type: day.type, scheduled: { entry: day.entry, exit: day.exit },
        entry: track?.entry ?? null, lunchStart: track?.lunchStart ?? null, lunchReturn: track?.lunchReturn ?? null, exit: track?.exit ?? null,
        worked: track?.totalWorked ?? null, balance: track?.dailyBalance ?? null, late: track?.lateMinutes ?? 0,
        overtime50: track?.overtime50Minutes ?? 0, overtime100: track?.overtime100Minutes ?? 0, night: track?.nightShiftMinutes ?? 0,
        status: dayStatus(day, track, today), holiday: day.holidayName,
      };
    });
    const sum = (key: 'worked' | 'balance' | 'late' | 'overtime50' | 'overtime100' | 'night') => rows.reduce((total, row) => total + (row[key] ?? 0), 0);
    return {
      employee, month, closing,
      totals: { worked: sum('worked'), balance: sum('balance'), late: sum('late'), overtime50: sum('overtime50'), overtime100: sum('overtime100'), night: sum('night'), absences: rows.filter((row) => row.status === 'FALTA').length, bankBalance: bank?.balanceMinutes ?? 0 },
      days: rows,
    };
  }
}

export function labelType(type: ResolvedDay['type']) {
  const labels: Record<string, string> = {
    TRABALHO: 'Trabalho', FOLGA: 'Folga', FERIADO: 'Feriado', FERIAS: 'Ferias', ATESTADO: 'Atestado', SUSPENSAO: 'Suspensao',
    COMPENSACAO: 'Trabalho (troca)', FERIADO_LOCAL: 'Feriado local', AJUSTE_ESCALA: 'Ajuste de escala', SEM_ESCALA: 'Sem escala',
  };
  return labels[type] ?? type;
}
