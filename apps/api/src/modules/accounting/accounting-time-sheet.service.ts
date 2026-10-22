import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountingAccessService } from '../../common/accounting-access';
import { TimeZoneService } from '../../common/services/timezone.service';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { occurrenceLabel } from '../time-track/occurrence-label';
import { TimeClosingService } from '../time-track/time-closing.service';
import { TimeTrackRepository } from '../time-track/time-track.repository';

const pad = (n: number) => String(n).padStart(2, '0');

/** Competência no calendário de America/Sao_Paulo (sem month, usa o mês corrente em São Paulo, nunca o UTC). */
export function resolveMonthSaoPaulo(tz: Pick<TimeZoneService, 'formatToBRT'>, month?: string, now: Date = new Date()) {
  const key = month ?? tz.formatToBRT(now, 'yyyy-MM');
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  if (!match) throw new BadRequestException('Mes invalido. Use AAAA-MM.');
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  // TimeTrack.date é @db.Date: o dia civil de São Paulo gravado como meia-noite UTC.
  return { key, year, month: monthNumber, start: new Date(Date.UTC(year, monthNumber - 1, 1)), end: new Date(Date.UTC(year, monthNumber, 1)), lastDay: new Date(Date.UTC(year, monthNumber, 0)).getUTCDate() };
}

const dayKey = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/**
 * Folha de ponto para o contador (somente leitura). Os números diários são os já calculados e gravados pelo módulo de
 * ponto (TimeTrack); a conferência de pendências e o status do fechamento vêm do TimeClosingService. Nada é recalculado aqui.
 */
@Injectable()
export class AccountingTimeSheetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountingAccessService,
    private readonly tracks: TimeTrackRepository,
    private readonly closing: TimeClosingService,
    private readonly tz: TimeZoneService,
  ) {}

  private hhmm(date: Date | null | undefined) {
    return date ? this.tz.formatToBRT(date, 'HH:mm') : null;
  }

  async companySheets(actor: JwtUser, companyId: string, month?: string) {
    await this.access.assertAccountantCanAccess(actor, companyId);
    const period = resolveMonthSaoPaulo(this.tz, month);
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, document: true } });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    const lastDay = new Date(Date.UTC(period.year, period.month, 0));

    const [employees, tracks, closings, banks, conference] = await Promise.all([
      this.prisma.employee.findMany({
        where: { companyId, admissionDate: { lte: lastDay }, OR: [{ terminationDate: null }, { terminationDate: { gte: period.start } }] },
        select: { id: true, name: true, position: true }, orderBy: { name: 'asc' }, take: 2000,
      }),
      this.tracks.list(companyId, period.start, period.end),
      this.prisma.timeClosing.findMany({ where: { companyId, periodEnd: { gte: period.start, lt: period.end } }, select: { employeeId: true, status: true, periodStart: true, periodEnd: true }, orderBy: { periodStart: 'desc' }, take: 5000 }),
      this.prisma.overtimeBank.findMany({ where: { companyId }, select: { employeeId: true, balanceMinutes: true }, take: 5000 }),
      this.closing.conference(companyId, period.key),
    ]);
    const closingBy = new Map<string, (typeof closings)[number]>();
    for (const row of closings) if (!closingBy.has(row.employeeId)) closingBy.set(row.employeeId, row);
    const bankBy = new Map(banks.map((b) => [b.employeeId, b.balanceMinutes]));
    const issuesBy = new Map(conference.employees.map((e: any) => [e.employeeId, e.issues?.length ?? 0]));

    const rows = employees.map((employee) => {
      const own = tracks.filter((t) => t.employeeId === employee.id);
      const sum = (pick: (t: (typeof own)[number]) => number | null | undefined) => own.reduce((total, t) => total + (pick(t) ?? 0), 0);
      const closingRow = closingBy.get(employee.id);
      return {
        employeeId: employee.id, name: employee.name, position: employee.position,
        daysRecorded: own.length,
        workedMinutes: sum((t) => t.totalWorked),
        overtime50Minutes: sum((t) => t.overtime50Minutes),
        overtime100Minutes: sum((t) => t.overtime100Minutes),
        nightShiftMinutes: sum((t) => t.nightShiftMinutes),
        absenceDays: own.filter((t) => t.incidentType === 'falta').length,
        absenceMinutes: sum((t) => t.absenceMinutes),
        lateMinutes: sum((t) => t.lateMinutes),
        lateDays: own.filter((t) => (t.lateMinutes ?? 0) > 0).length,
        monthBalanceMinutes: sum((t) => t.dailyBalance),
        hourBankBalanceMinutes: bankBy.get(employee.id) ?? 0,
        pendingIssues: issuesBy.get(employee.id) ?? 0,
        closingStatus: closingRow?.status ?? 'NO_CLOSING',
      };
    });
    return { period: { key: period.key, year: period.year, month: period.month, timezone: 'America/Sao_Paulo' }, company, employees: rows };
  }

  async employeeSheet(actor: JwtUser, companyId: string, employeeId: string, month?: string) {
    await this.access.assertAccountantCanAccess(actor, companyId);
    const period = resolveMonthSaoPaulo(this.tz, month);
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId }, select: { id: true, name: true, position: true } });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');

    const [tracks, occurrences, closings, bank] = await Promise.all([
      this.tracks.listEmployeeMonth(companyId, employeeId, period.start, period.end, 0, 62),
      this.prisma.timeOccurrence.findMany({ where: { companyId, employeeId, date: { gte: period.start, lt: period.end } }, select: { id: true, date: true, type: true, minutes: true, status: true, reason: true, observation: true }, orderBy: { date: 'asc' }, take: 500 }),
      this.prisma.timeClosing.findMany({
        where: { companyId, employeeId, periodEnd: { gte: period.start, lt: period.end } },
        select: { id: true, status: true, periodStart: true, periodEnd: true, adjustments: { select: { id: true, field: true, oldValue: true, newValue: true, reason: true, createdAt: true }, orderBy: { createdAt: 'asc' } } },
        orderBy: { periodStart: 'desc' }, take: 5,
      }),
      this.prisma.overtimeBank.findFirst({ where: { companyId, employeeId }, select: { balanceMinutes: true } }),
    ]);

    // Coordenadas e endereço das batidas não são expostos à contabilidade.
    const days = tracks.map((t) => ({
      date: dayKey(t.date),
      punches: { entry: this.hhmm(t.entry), lunchStart: this.hhmm(t.lunchStart), lunchReturn: this.hhmm(t.lunchReturn), exit: this.hhmm(t.exit) },
      workedMinutes: t.totalWorked ?? 0,
      balanceMinutes: t.dailyBalance ?? 0,
      overtime50Minutes: t.overtime50Minutes,
      overtime100Minutes: t.overtime100Minutes,
      nightShiftMinutes: t.nightShiftMinutes,
      lateMinutes: t.lateMinutes ?? 0,
      earlyLeaveMinutes: t.earlyLeaveMinutes ?? 0,
      absenceMinutes: t.absenceMinutes ?? 0,
      incidentType: t.incidentType ?? null,
      occurrence: occurrenceLabel(t),
      overtimeApprovalStatus: t.overtimeApprovalStatus,
      overtimeHandling: t.overtimeHandling,
      manualAdjustment: t.manualReason || t.manualStatus === 'pending' || t.manualStatus === 'rejected' ? { reason: t.manualReason ?? null, status: t.manualStatus ?? null } : null,
      observation: t.observation ?? null,
    }));
    const sum = (pick: (d: (typeof days)[number]) => number) => days.reduce((total, d) => total + pick(d), 0);
    return {
      period: { key: period.key, year: period.year, month: period.month, timezone: 'America/Sao_Paulo' },
      employee,
      totals: {
        daysRecorded: days.length, workedMinutes: sum((d) => d.workedMinutes), overtime50Minutes: sum((d) => d.overtime50Minutes), overtime100Minutes: sum((d) => d.overtime100Minutes),
        nightShiftMinutes: sum((d) => d.nightShiftMinutes), lateMinutes: sum((d) => d.lateMinutes), absenceMinutes: sum((d) => d.absenceMinutes),
        absenceDays: days.filter((d) => d.incidentType === 'falta').length, balanceMinutes: sum((d) => d.balanceMinutes), hourBankBalanceMinutes: bank?.balanceMinutes ?? 0,
      },
      days,
      occurrences: occurrences.map((o) => ({ ...o, date: dayKey(o.date) })),
      closings: closings.map((c) => ({ id: c.id, status: c.status, periodStart: dayKey(c.periodStart), periodEnd: dayKey(c.periodEnd), adjustments: c.adjustments })),
    };
  }
}
