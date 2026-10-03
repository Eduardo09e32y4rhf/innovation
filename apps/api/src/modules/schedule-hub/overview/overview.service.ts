import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { JwtUser } from '../../../common/types/auth.types';
import { toDateOnly } from '../../../common/utils/date.utils';
import { SCHEDULE_ACCESS, scopeOf } from '../../schedule/access/schedule-access';
import { ScheduleScopeService } from '../../schedule/access/schedule-scope.service';
import { DayResolver, dateKey, minutesBetween } from '../calendar/day-resolver';
import { labelType, monthRange } from '../calendar/calendar.service';
import { RequestsService } from '../requests/requests.service';

const nowHm = () => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date());

@Injectable()
export class OverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScheduleScopeService,
    private readonly days: DayResolver,
    private readonly requests: RequestsService,
  ) {}

  async overview(actor: JwtUser) {
    const caps = SCHEDULE_ACCESS[actor.role] ?? {};
    const today = toDateOnly(new Date());
    const month = dateKey(today).slice(0, 7);
    const result: Record<string, unknown> = { role: actor.role, capabilities: caps, today: dateKey(today), month };

    const me = await this.scope.employeeOf(actor);
    if (caps.punch && me) {
      const [day, bank, pending, track] = await Promise.all([
        this.days.resolveDay(actor.companyId, me.id, today),
        this.prisma.overtimeBank.findFirst({ where: { companyId: actor.companyId, employeeId: me.id }, select: { balanceMinutes: true } }),
        this.prisma.scheduleRequest.count({ where: { companyId: actor.companyId, status: { in: ['PENDING', 'AWAITING_PEER'] }, OR: [{ requesterEmployeeId: me.id }, { peerEmployeeId: me.id }] } }),
        this.prisma.timeTrack.findFirst({ where: { companyId: actor.companyId, employeeId: me.id, date: today } }),
      ]);
      result.me = { employee: me, day, bankBalance: bank?.balanceMinutes ?? 0, pendingRequests: pending, punched: Boolean(track?.entry) };
    } else if (me) {
      result.me = { employee: me };
    }

    if (caps['calendar.read'] && caps['calendar.read'] !== 'self') result.team = await this.teamToday(actor);
    if (caps.approvals) result.pending = await this.pendingCounts(actor);
    if (caps['closing.write']) result.hr = await this.hrPanel(actor, month);
    if (caps['reports.read']) result.indicators = await this.indicators(actor, month);
    return result;
  }

  private async teamToday(actor: JwtUser) {
    const allowed = await this.scope.allowedEmployeeIds(actor, 'calendar.read');
    const employees = await this.prisma.employee.findMany({
      where: { companyId: actor.companyId, status: 'ACTIVE', ...(allowed !== null ? { id: { in: allowed } } : {}) },
      select: { id: true, name: true, department: true },
      orderBy: { name: 'asc' },
      take: 300,
    });
    const today = toDateOnly(new Date());
    const ids = employees.map((employee) => employee.id);
    const [resolved, tracks] = await Promise.all([
      this.days.resolveMany(actor.companyId, ids, today, today),
      this.prisma.timeTrack.findMany({ where: { companyId: actor.companyId, employeeId: { in: ids }, date: today } }),
    ]);
    const trackMap = new Map(tracks.map((track) => [track.employeeId, track]));
    const hm = nowHm();
    const counts = { working: 0, finished: 0, late: 0, waiting: 0, absent: 0, off: 0, vacation: 0, noSchedule: 0 };

    const people = employees.map((employee) => {
      const day = resolved.get(employee.id)![0];
      const track = trackMap.get(employee.id);
      let status: string;
      if (day.type === 'SEM_ESCALA') { status = 'SEM_ESCALA'; counts.noSchedule += 1; }
      else if (day.type === 'FERIAS') { status = 'FERIAS'; counts.vacation += 1; }
      else if (!day.working) { status = day.type; counts.off += 1; }
      else if (track?.exit) { status = 'ENCERRADO'; counts.finished += 1; }
      else if (track?.entry) { status = 'TRABALHANDO'; counts.working += 1; }
      else if (day.entry && hm > day.entry && minutesBetween(day.entry, hm) > 10 && minutesBetween(day.entry, hm) < 720) { status = 'ATRASADO'; counts.late += 1; }
      else { status = 'AGUARDANDO'; counts.waiting += 1; }
      return { id: employee.id, name: employee.name, department: employee.department, status, label: status === 'TRABALHANDO' ? 'Trabalhando' : status === 'ENCERRADO' ? 'Encerrou' : status === 'ATRASADO' ? 'Atrasado' : status === 'AGUARDANDO' ? 'Aguardando' : status === 'SEM_ESCALA' ? 'Sem escala' : labelType(day.type), entry: day.entry, exit: day.exit, firstPunch: track?.entry ?? null };
    });
    return { counts, total: people.length, people };
  }

  private async pendingCounts(actor: JwtUser) {
    const allowed = await this.scope.allowedEmployeeIds(actor, 'approvals');
    const filter = allowed !== null ? { in: allowed } : undefined;
    const [requests, punches, overtime] = await Promise.all([
      this.requests.list(actor, { view: 'approvals', status: 'PENDING' }).then((items) => items.length),
      this.prisma.timeTrack.count({ where: { companyId: actor.companyId, manualStatus: 'pending', ...(filter ? { employeeId: filter } : {}) } }),
      this.prisma.timeTrack.count({ where: { companyId: actor.companyId, overtimeApprovalStatus: 'PENDING', OR: [{ overtime50Minutes: { gt: 0 } }, { overtime100Minutes: { gt: 0 } }], ...(filter ? { employeeId: filter } : {}) } }),
    ]);
    return { requests, punches, overtime, total: requests + punches + overtime };
  }

  async approvals(actor: JwtUser) {
    const allowed = await this.scope.allowedEmployeeIds(actor, 'approvals');
    const filter = allowed !== null ? { in: allowed } : undefined;
    const [requests, punches, overtime] = await Promise.all([
      this.requests.list(actor, { view: 'approvals', status: 'PENDING' }),
      this.prisma.timeTrack.findMany({ where: { companyId: actor.companyId, manualStatus: 'pending', ...(filter ? { employeeId: filter } : {}) }, include: { employee: { select: { id: true, name: true, department: true } } }, orderBy: { date: 'desc' }, take: 100 }),
      this.prisma.timeTrack.findMany({ where: { companyId: actor.companyId, overtimeApprovalStatus: 'PENDING', OR: [{ overtime50Minutes: { gt: 0 } }, { overtime100Minutes: { gt: 0 } }], ...(filter ? { employeeId: filter } : {}) }, include: { employee: { select: { id: true, name: true, department: true } } }, orderBy: { date: 'desc' }, take: 100 }),
    ]);
    return {
      requests,
      punches: punches.map((track) => ({ id: track.id, date: dateKey(track.date), employee: track.employee, reason: track.manualReason, observation: track.observation, entry: track.entry, exit: track.exit })),
      overtime: overtime.map((track) => ({ id: track.id, date: dateKey(track.date), employee: track.employee, overtime50: track.overtime50Minutes, overtime100: track.overtime100Minutes, exceedsLimit: track.overtimeExceedsLimit })),
    };
  }

  private async hrPanel(actor: JwtUser, month: string) {
    const { from, to } = monthRange(month);
    const employees = await this.prisma.employee.findMany({ where: { companyId: actor.companyId, status: 'ACTIVE' }, select: { id: true, name: true } });
    const withSchedule = await this.prisma.userSchedule.findMany({
      where: { companyId: actor.companyId, employeeId: { in: employees.map((employee) => employee.id) }, startDate: { lte: to }, OR: [{ endDate: null }, { endDate: { gte: from } }] },
      select: { employeeId: true },
    });
    const covered = new Set(withSchedule.map((item) => item.employeeId));
    const closings = await this.prisma.timeClosing.groupBy({ by: ['status'], where: { companyId: actor.companyId, periodStart: { lte: to }, periodEnd: { gte: from } }, _count: true });
    const noPunchToday = await this.prisma.timeTrack.count({ where: { companyId: actor.companyId, date: toDateOnly(new Date()), entry: { not: null } } });
    return {
      withoutSchedule: employees.filter((employee) => !covered.has(employee.id)).map((employee) => ({ id: employee.id, name: employee.name })).slice(0, 50),
      withoutScheduleCount: employees.filter((employee) => !covered.has(employee.id)).length,
      activeEmployees: employees.length,
      punchedToday: noPunchToday,
      closing: Object.fromEntries(closings.map((row) => [row.status, row._count])),
    };
  }

  private async indicators(actor: JwtUser, month: string) {
    const { from, to } = monthRange(month);
    const allowed = await this.scope.allowedEmployeeIds(actor, 'reports.read');
    const tracks = await this.prisma.timeTrack.findMany({
      where: { companyId: actor.companyId, date: { gte: from, lte: to }, ...(allowed !== null ? { employeeId: { in: allowed } } : {}) },
      select: { employeeId: true, totalWorked: true, dailyBalance: true, lateMinutes: true, overtime50Minutes: true, overtime100Minutes: true, absenceMinutes: true, nightShiftMinutes: true, employee: { select: { department: true } } },
    });
    const byDepartment = new Map<string, { department: string; worked: number; overtime: number; late: number; absences: number; employees: Set<string> }>();
    for (const track of tracks) {
      const key = track.employee?.department || 'Sem setor';
      const entry = byDepartment.get(key) ?? { department: key, worked: 0, overtime: 0, late: 0, absences: 0, employees: new Set<string>() };
      entry.worked += track.totalWorked ?? 0;
      entry.overtime += track.overtime50Minutes + track.overtime100Minutes;
      entry.late += track.lateMinutes;
      entry.absences += (track.absenceMinutes ?? 0) > 0 ? 1 : 0;
      entry.employees.add(track.employeeId);
      byDepartment.set(key, entry);
    }
    const banks = await this.prisma.overtimeBank.aggregate({ where: { companyId: actor.companyId, ...(allowed !== null ? { employeeId: { in: allowed } } : {}) }, _sum: { balanceMinutes: true } });
    const sum = (key: 'overtime50Minutes' | 'overtime100Minutes' | 'lateMinutes' | 'nightShiftMinutes') => tracks.reduce((total, track) => total + (track[key] ?? 0), 0);
    return {
      month,
      totals: { worked: tracks.reduce((total, track) => total + (track.totalWorked ?? 0), 0), overtime50: sum('overtime50Minutes'), overtime100: sum('overtime100Minutes'), late: sum('lateMinutes'), night: sum('nightShiftMinutes'), absences: tracks.filter((track) => (track.absenceMinutes ?? 0) > 0).length, bankBalance: banks._sum.balanceMinutes ?? 0 },
      byDepartment: [...byDepartment.values()].map((entry) => ({ department: entry.department, worked: entry.worked, overtime: entry.overtime, late: entry.late, absences: entry.absences, employees: entry.employees.size })).sort((a, b) => b.overtime - a.overtime),
    };
  }

  async reportRows(actor: JwtUser, month: string) {
    const { from, to } = monthRange(month);
    const allowed = await this.scope.allowedEmployeeIds(actor, 'reports.read');
    const employees = await this.prisma.employee.findMany({ where: { companyId: actor.companyId, status: 'ACTIVE', ...(allowed !== null ? { id: { in: allowed } } : {}) }, select: { id: true, name: true, department: true, position: true }, orderBy: { name: 'asc' }, take: 500 });
    const tracks = await this.prisma.timeTrack.groupBy({
      by: ['employeeId'],
      where: { companyId: actor.companyId, date: { gte: from, lte: to }, employeeId: { in: employees.map((employee) => employee.id) } },
      _sum: { totalWorked: true, dailyBalance: true, lateMinutes: true, overtime50Minutes: true, overtime100Minutes: true, nightShiftMinutes: true },
      _count: { _all: true },
    });
    const banks = await this.prisma.overtimeBank.findMany({ where: { companyId: actor.companyId, employeeId: { in: employees.map((employee) => employee.id) } }, select: { employeeId: true, balanceMinutes: true } });
    const trackMap = new Map(tracks.map((row) => [row.employeeId, row]));
    const bankMap = new Map(banks.map((row) => [row.employeeId, row.balanceMinutes]));
    return employees.map((employee) => {
      const row = trackMap.get(employee.id);
      return {
        employeeId: employee.id, name: employee.name, department: employee.department ?? '', position: employee.position ?? '',
        days: row?._count._all ?? 0, worked: row?._sum.totalWorked ?? 0, balance: row?._sum.dailyBalance ?? 0, late: row?._sum.lateMinutes ?? 0,
        overtime50: row?._sum.overtime50Minutes ?? 0, overtime100: row?._sum.overtime100Minutes ?? 0, night: row?._sum.nightShiftMinutes ?? 0, bank: bankMap.get(employee.id) ?? 0,
      };
    });
  }

  async reportCsv(actor: JwtUser, month: string) {
    const rows = await this.reportRows(actor, month);
    const hm = (value: number) => `${value < 0 ? '-' : ''}${Math.floor(Math.abs(value) / 60)}:${String(Math.abs(value) % 60).padStart(2, '0')}`;
    const esc = (value: unknown) => { const text = String(value ?? ''); return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`; };
    const header = ['Funcionário', 'Setor', 'Cargo', 'Dias com ponto', 'Horas trabalhadas', 'Saldo', 'Atrasos', 'HE 50%', 'HE 100%', 'Adicional noturno', 'Banco de horas'];
    const lines = rows.map((row) => [row.name, row.department, row.position, row.days, hm(row.worked), hm(row.balance), hm(row.late), hm(row.overtime50), hm(row.overtime100), hm(row.night), hm(row.bank)]);
    return `﻿${[header, ...lines].map((line) => line.map(esc).join(';')).join('\r\n')}`;
  }

  scopeLabel(actor: JwtUser) {
    return scopeOf(actor.role, 'reports.read');
  }
}
