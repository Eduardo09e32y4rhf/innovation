import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TimeClosingStatus } from '@prisma/client';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { PayrollCalculationService } from './payroll-calculation.service';
import { saoPauloDayOfWeek, toSaoPauloDateKey } from '../../common/utils/date.utils';

interface GenerateClosingDto {
  employeeIds?: string[];
  periodStart?: string;
  periodEnd?: string;
  month?: number;
  year?: number;
  referenceMonth?: number;
  referenceYear?: number;
}

@Injectable()
export class TimeClosingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payroll: PayrollCalculationService,
  ) {}

  async generate(companyId: string, actor: JwtUser, dto: GenerateClosingDto) {
    const { periodStart, periodEnd } = this.resolvePeriod(dto);
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        ...(dto.employeeIds?.length ? { id: { in: dto.employeeIds } } : {}),
      },
      include: { workScheduleRule: true, userSchedules: { include: { schedule: true }, orderBy: { startDate: 'desc' } } },
      orderBy: { name: 'asc' },
    });
    if (!employees.length) throw new BadRequestException('Nenhum funcionario ativo encontrado para o fechamento.');
    const withoutSalary = employees.filter((employee) => Number(employee.salary || 0) <= 0);
    if (withoutSalary.length) {
      throw new BadRequestException(`Preencha o salario na ficha antes de fechar: ${withoutSalary.map((item) => item.name).join(', ')}`);
    }

    const existingLocked = await this.prisma.timeClosing.findFirst({
      where: {
        companyId,
        employeeId: { in: employees.map((employee) => employee.id) },
        periodStart,
        periodEnd,
        status: { not: TimeClosingStatus.DRAFT },
      },
    });
    if (existingLocked) throw new BadRequestException('O periodo possui fechamento em revisao, aprovado ou fechado. Reabra-o antes de gerar novamente.');

    const overtimeRule = await this.prisma.overtimeRule.upsert({
      where: { companyId },
      create: { companyId },
      update: {},
    });
    const holidays = await this.prisma.holiday.findMany({
      where: { OR: [{ companyId }, { companyId: null }], date: { gte: periodStart, lte: periodEnd } },
    });
    const holidayKeys = new Set(holidays.map((holiday) => this.dateKey(holiday.date)));
    const results = [];

    for (const employee of employees) {
      const [tracks, occurrences, schedules] = await Promise.all([
        this.prisma.timeTrack.findMany({
          where: { companyId, employeeId: employee.id, date: { gte: periodStart, lte: periodEnd } },
          orderBy: { date: 'asc' },
        }),
        this.prisma.timeOccurrence.findMany({
          where: { companyId, employeeId: employee.id, date: { gte: periodStart, lte: periodEnd }, status: 'APPROVED' },
        }),
        this.prisma.userSchedule.findMany({
          where: {
            companyId,
            employeeId: employee.id,
            startDate: { lte: periodEnd },
            OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
          },
          include: { schedule: true },
          orderBy: { startDate: 'desc' },
        }),
      ]);

      const trackByDate = new Map(tracks.map((track) => [this.dateKey(track.date), track]));
      const justifiedDates = new Set(occurrences
        .filter((item) => this.isJustifyingOccurrence(item.type))
        .map((item) => this.dateKey(item.date)));
      let payableWorkdays = 0;
      let paidRestDays = 0;
      let missingAbsenceMinutes = 0;
      let missingAbsenceDays = 0;
      let scheduledMinutesInPeriod = 0;

      const today = new Date();
      const todayKey = this.dateKey(today);

      for (const date of this.eachDate(periodStart, periodEnd)) {
        const key = this.dateKey(date);
        const schedule = schedules.find((item) => item.startDate <= date && (!item.endDate || item.endDate >= date));
        const restDays = schedule?.schedule.restDays ?? employee.workScheduleRule?.restDaysOfWeek ?? [0, 6];
        const dayOfWeek = saoPauloDayOfWeek(date);
        const isRest = restDays.includes(dayOfWeek) || holidayKeys.has(key) || this.isOffCycle12x36(date, schedule?.schedule);
        
        let expectedForDay = this.expectedMinutes(employee, schedule?.schedule);
        if (holidayKeys.has(key) || this.isOffCycle12x36(date, schedule?.schedule)) {
          expectedForDay = 0;
        } else if (restDays.includes(dayOfWeek)) {
          expectedForDay = 0;
        }
        
        scheduledMinutesInPeriod += expectedForDay;

        if (dayOfWeek === 0 || holidayKeys.has(key)) paidRestDays++;
        
        if (!isRest) {
          payableWorkdays++;
          // Only count absences for past or present days
          if (date <= today && !trackByDate.has(key) && !justifiedDates.has(key)) {
            missingAbsenceMinutes += expectedForDay;
            missingAbsenceDays++;
          }
        }
      }

      let normalMinutes = 0;
      let overtime50Minutes = 0;
      let overtime100Minutes = 0;
      let nightShiftMinutes = 0;
      let absenceMinutes = missingAbsenceMinutes;
      let lateMinutes = 0;
      let earlyLeaveMinutes = 0;
      let absenceDays = missingAbsenceDays;
      let lateArrivalDays = 0;
      let fallbackPunches = 0;

      for (const track of tracks) {
        const totalOvertime = (track.overtime50Minutes || 0) + (track.overtime100Minutes || 0);
        normalMinutes += Math.max(0, (track.totalWorked || 0) - totalOvertime);
        const approved = track.overtimeApprovalStatus === 'APPROVED';
        const paymentRatio = approved ? this.paymentRatio(track) : 0;
        overtime50Minutes += Math.round((track.overtime50Minutes || 0) * paymentRatio);
        overtime100Minutes += Math.round((track.overtime100Minutes || 0) * paymentRatio);
        nightShiftMinutes += track.nightShiftMinutes || 0;
        absenceMinutes += Math.max(0, track.absenceMinutes || (track.dailyBalance && track.dailyBalance < 0 ? Math.abs(track.dailyBalance) : 0));
        lateMinutes += track.lateMinutes || 0;
        earlyLeaveMinutes += track.earlyLeaveMinutes || 0;
        if (track.incidentType === 'falta') absenceDays++;
        if ((track.lateMinutes || 0) > 0) lateArrivalDays++;
        if (track.clockedInWithoutFacial) fallbackPunches++;
      }

      const weeklyMinutes = this.weeklyMinutesFromSchedule(schedules[0]?.schedule)
        ?? employee.workScheduleRule?.weeklyMinutes
        ?? this.defaultWeeklyMinutes(employee.dailyWorkload, employee.workScale);
      
      const totalDaysInPeriod = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1;
      const isPartialMonth = totalDaysInPeriod < 28 || totalDaysInPeriod > 31;

      const dependents = Array.isArray(employee.dependents) ? employee.dependents.length : 0;
      const financial = this.payroll.calculate({
        salary: Number(employee.salary),
        weeklyMinutes,
        isPartialMonth,
        scheduledMinutesInPeriod,
        overtime50Minutes,
        overtime100Minutes,
        nightShiftMinutes,
        absenceMinutes,
        payableWorkdays,
        paidRestDays,
        dependents,
        overtime50Factor: Number(overtimeRule.weekdayRate),
        overtime100Factor: Number(overtimeRule.sundayHolidayRate),
        nightShiftPercent: (Number(overtimeRule.nightShiftRate) - 1) * 100,
        dsrEnabled: overtimeRule.dsrEnabled,
      });

      await this.prisma.timeClosing.deleteMany({
        where: { companyId, employeeId: employee.id, periodStart, periodEnd, status: TimeClosingStatus.DRAFT },
      });
      results.push(await this.prisma.timeClosing.create({
        data: {
          companyId,
          employeeId: employee.id,
          periodStart,
          periodEnd,
          status: TimeClosingStatus.DRAFT,
          normalHours: this.hours(normalMinutes),
          overtime50: this.hours(overtime50Minutes),
          overtime100: this.hours(overtime100Minutes),
          nightShift: this.hours(nightShiftMinutes),
          absences: absenceDays,
          lateArrivals: lateArrivalDays,
          fallbackPunches,
          payableWorkdays,
          paidRestDays,
          absenceMinutes,
          lateMinutes,
          earlyLeaveMinutes,
          ...financial,
          totalPayable: financial.netPay,
        },
        include: { employee: true },
      }));
    }
    return results;
  }

  async list(companyId: string, status?: TimeClosingStatus) {
    return this.prisma.timeClosing.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      include: { employee: true },
      orderBy: [{ periodStart: 'desc' }, { employee: { name: 'asc' } }],
    });
  }

  async getById(companyId: string, id: string, actor?: JwtUser) {
    const closing = await this.prisma.timeClosing.findFirst({
      where: { id, companyId },
      include: {
        employee: true,
        company: true,
        adjustments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!closing) throw new NotFoundException('Fechamento nao encontrado.');
    const tracks = await this.prisma.timeTrack.findMany({
      where: { companyId, employeeId: closing.employeeId, date: { gte: closing.periodStart, lte: closing.periodEnd } },
      orderBy: { date: 'asc' },
    });
    return { ...closing, tracks };
  }

  async adjust(companyId: string, actor: JwtUser, id: string, dto: { field: string; newValue: string; reason: string }) {
    const allowed = ['salaryBase', 'overtime50', 'overtime100', 'nightShift', 'absenceMinutes', 'lateMinutes', 'earlyLeaveMinutes'];
    if (!allowed.includes(dto.field)) throw new BadRequestException('Campo nao permitido para ajuste.');
    if (!dto.reason?.trim()) throw new BadRequestException('Informe o motivo do ajuste.');
    const closing = await this.prisma.timeClosing.findFirst({ where: { id, companyId }, include: { employee: true } });
    if (!closing) throw new NotFoundException('Fechamento nao encontrado.');
    if (closing.status !== TimeClosingStatus.DRAFT && closing.status !== TimeClosingStatus.IN_REVIEW) {
      throw new BadRequestException('Somente fechamento em rascunho ou revisao pode ser ajustado.');
    }
    const value = Number(dto.newValue);
    if (!Number.isFinite(value) || value < 0) throw new BadRequestException('Informe um valor numerico nao negativo.');

    return this.prisma.$transaction(async (tx) => {
      await tx.timeClosingAdjustment.create({
        data: { timeClosingId: id, field: dto.field, oldValue: String((closing as unknown as Record<string, unknown>)[dto.field]), newValue: String(value), reason: dto.reason.trim(), changedBy: actor.sub },
      });
      const updated = { ...closing, [dto.field]: value };
      const financial = this.payroll.calculate({
        salary: Number(updated.salaryBase),
        weeklyMinutes: Number(updated.monthlyDivisor) * 12,
        isPartialMonth: false,
        scheduledMinutesInPeriod: 0,
        overtime50Minutes: Number(updated.overtime50) * 60,
        overtime100Minutes: Number(updated.overtime100) * 60,
        nightShiftMinutes: Number(updated.nightShift) * 60,
        absenceMinutes: Number(updated.absenceMinutes),
        payableWorkdays: Number(updated.payableWorkdays),
        paidRestDays: Number(updated.paidRestDays),
        dependents: Array.isArray(updated.employee.dependents) ? updated.employee.dependents.length : 0,
      });
      return tx.timeClosing.update({
        where: { id },
        data: { [dto.field]: value, ...financial, totalPayable: financial.netPay },
        include: { employee: true },
      });
    });
  }

  async submitReview(companyId: string, id: string) {
    return this.changeStatus(companyId, id, TimeClosingStatus.DRAFT, TimeClosingStatus.IN_REVIEW);
  }

  async approve(companyId: string, id: string) {
    return this.changeStatus(companyId, id, TimeClosingStatus.IN_REVIEW, TimeClosingStatus.APPROVED);
  }

  async close(companyId: string, actor: JwtUser, id: string) {
    const closing = await this.changeStatus(companyId, id, TimeClosingStatus.APPROVED, TimeClosingStatus.CLOSED, {
      closedAt: new Date(), closedBy: actor.sub,
    });
    return closing;
  }

  async reopen(companyId: string, actor: JwtUser, id: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Informe o motivo da reabertura.');
    const closing = await this.prisma.timeClosing.findFirst({ where: { id, companyId } });
    if (!closing || closing.status !== TimeClosingStatus.CLOSED) throw new BadRequestException('Somente fechamento concluido pode ser reaberto.');
    return this.prisma.timeClosing.update({
      where: { id },
      data: { status: TimeClosingStatus.DRAFT, reopenedAt: new Date(), reopenedBy: actor.sub, reopenReason: reason.trim(), closedAt: null, closedBy: null },
    });
  }

  async delete(companyId: string, id: string) {
    const closing = await this.prisma.timeClosing.findFirst({ where: { id, companyId } });
    if (!closing) throw new NotFoundException('Fechamento nao encontrado.');
    if (closing.status === TimeClosingStatus.CLOSED) throw new BadRequestException('Reabra o fechamento antes de excluir.');
    await this.prisma.timeClosing.delete({ where: { id } });
    return { success: true };
  }

  getPdf(id: string) {
    return { url: `/time-closing/${id}/pdf-stream` };
  }

  async streamPdf(companyId: string, id: string, res: any, actor?: JwtUser) {
    const closing = await this.getById(companyId, id, actor);
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 42, size: 'A4' });
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename=Fechamento_${this.safeFilename(closing.employee.name)}_${this.dateKey(closing.periodStart)}.pdf`);
    doc.pipe(res.raw);
    doc.fontSize(18).fillColor('#0f172a').text('MEMORIA DE CALCULO DA FOLHA', { align: 'center' });
    doc.moveDown().fontSize(10).fillColor('#334155');
    doc.text(`Empresa: ${closing.company?.name || 'Innovation RH'}`);
    doc.text(`Funcionario: ${closing.employee.name} | CPF: ${closing.employee.cpf || '-'}`);
    doc.text(`Periodo: ${this.formatDate(closing.periodStart)} a ${this.formatDate(closing.periodEnd)}`);
    doc.text(`Status: ${closing.status} | Regra: ${closing.calculationVersion}`);
    doc.text(`Escala Vinculada: ${(closing as any).scaleTypeUsed ?? 'N/A'}`);
    doc.moveDown().fontSize(13).fillColor('#0f766e').text('Jornada consolidada');
    doc.fontSize(10).fillColor('#334155')
      .text(`Horas normais: ${closing.normalHours.toFixed(2)} h`)
      .text(`Horas extras 50%: ${closing.overtime50.toFixed(2)} h`)
      .text(`Horas extras 100%: ${closing.overtime100.toFixed(2)} h`)
      .text(`Horas noturnas reduzidas: ${closing.nightShift.toFixed(2)} h`)
      .text(`Atrasos: ${closing.lateMinutes} min | Saidas antecipadas: ${closing.earlyLeaveMinutes} min | Debitos: ${closing.absenceMinutes} min`);
    doc.moveDown().fontSize(13).fillColor('#0f766e').text('Proventos e descontos');
    doc.fontSize(10).fillColor('#334155')
      .text(`Salario base: ${this.currency(closing.salaryBase)}`)
      .text(`Valor hora (divisor ${closing.monthlyDivisor}): ${this.currency(closing.hourlyRate)}`)
      .text(`Hora extra 50%: ${this.currency(closing.overtime50Value)}`)
      .text(`Hora extra 100%: ${this.currency(closing.overtime100Value)}`)
      .text(`Adicional noturno: ${this.currency(closing.nightShiftValue)}`)
      .text(`Reflexo DSR: ${this.currency(closing.dsrValue)}`)
      .text(`Desconto de jornada: -${this.currency(closing.absenceDiscount)}`)
      .text(`Base de Calculo: ${this.currency(closing.grossPay)}`)
      .text(`INSS: -${this.currency(closing.inssDiscount)}`)
      .text(`IRRF: -${this.currency(closing.irrfDiscount)}`)
      .text(`FGTS patronal (nao descontado): ${this.currency(closing.fgtsAmount)}`);
    doc.moveDown().fontSize(15).fillColor('#0f172a').text(`Liquido estimado: ${this.currency(closing.netPay)}`, { align: 'right' });
    doc.moveDown(2).fontSize(8).fillColor('#64748b').text('Memoria de calculo gerada com tabelas oficiais vigentes em 2026. Validar rubricas especificas, beneficios e convencao coletiva no eSocial/contabilidade.', { align: 'center' });
    doc.end();
  }

  private async changeStatus(companyId: string, id: string, expected: TimeClosingStatus, next: TimeClosingStatus, extra: any = {}) {
    const closing = await this.prisma.timeClosing.findFirst({ where: { id, companyId } });
    if (!closing || closing.status !== expected) throw new BadRequestException(`Transicao invalida: esperado ${expected}.`);
    return this.prisma.timeClosing.update({ where: { id }, data: { status: next, ...extra }, include: { employee: true } });
  }

  private resolvePeriod(dto: GenerateClosingDto) {
    if (dto.periodStart && dto.periodEnd) {
      const periodStart = new Date(`${dto.periodStart.slice(0, 10)}T00:00:00.000Z`);
      const periodEnd = new Date(`${dto.periodEnd.slice(0, 10)}T00:00:00.000Z`);
      if (periodEnd < periodStart) throw new BadRequestException('Periodo final deve ser posterior ao inicial.');
      return { periodStart, periodEnd };
    }
    const month = Number(dto.month ?? dto.referenceMonth);
    const year = Number(dto.year ?? dto.referenceYear);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) throw new BadRequestException('Informe mes e ano validos.');
    return {
      periodStart: new Date(Date.UTC(year, month - 1, 1)),
      periodEnd: new Date(Date.UTC(year, month, 0)),
    };
  }

  private paymentRatio(track: any): number {
    const total = (track.overtime50Minutes || 0) + (track.overtime100Minutes || 0);
    if (!total || track.overtimeHandling === 'BANK') return 0;
    if (track.overtimeHandling === 'SPLIT') return Math.min(1, Math.max(0, (track.overtimePaymentMinutes || 0) / total));
    return 1;
  }

  private expectedMinutes(employee: any, schedule?: any): number {
    if (schedule?.cycleWorkHours) return schedule.cycleWorkHours * 60;
    if (schedule?.entryTime && schedule?.exitTime) {
      const gross = this.clockDifference(schedule.entryTime, schedule.exitTime);
      const pause = schedule.lunchStartTime && schedule.lunchReturnTime ? this.clockDifference(schedule.lunchStartTime, schedule.lunchReturnTime) : 0;
      return Math.max(0, gross - pause);
    }
    return employee.workScheduleRule?.dailyMinutes ?? this.workloadMinutes(employee.dailyWorkload) ?? 480;
  }

  private weeklyMinutesFromSchedule(schedule?: any): number | null {
    if (!schedule) return null;
    return this.expectedMinutes({}, schedule) * Math.max(1, schedule.workDays?.length || 5);
  }

  private defaultWeeklyMinutes(workload?: string | null, workScale?: string | null): number {
    const daily = this.workloadMinutes(workload) ?? 528;
    let days = 5;
    const scale = workScale?.toUpperCase();
    if (scale === '6X1') days = 6;
    else if (scale === '4X2') days = 4;
    return daily * days;
  }

  private workloadMinutes(value?: string | null): number | null {
    if (!value) return null;
    const [hours, minutes] = value.split(':').map(Number);
    return Number.isFinite(hours) ? hours * 60 + (minutes || 0) : null;
  }

  private clockDifference(start: string, end: string): number {
    const toMinutes = (value: string) => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + (minute || 0); };
    return (toMinutes(end) - toMinutes(start) + 1440) % 1440;
  }

  private isOffCycle12x36(date: Date, schedule?: any): boolean {
    if (schedule?.scaleType !== '12x36' || !schedule.cycleStartDate) return false;
    const days = Math.floor((date.getTime() - schedule.cycleStartDate.getTime()) / 86400000);
    return Math.abs(days) % 2 === 1;
  }

  private eachDate(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) dates.push(new Date(cursor));
    return dates;
  }

  private hours(minutes: number): number { return Math.round((minutes / 60) * 10000) / 10000; }
  private dateKey(date: Date): string { return toSaoPauloDateKey(date); }
  private isJustifyingOccurrence(type: string): boolean {
    return ['JUSTIFIED_ABSENCE', 'MEDICAL_CERTIFICATE', 'VACATION', 'LEAVE', 'DAY_OFF', 'DSR', 'HOLIDAY', 'EXTERNAL_WORK', 'HOME_OFFICE', 'TRAINING'].includes(String(type));
  }
  private formatDate(date: Date): string { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date); }
  private currency(value: number): string { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  private safeFilename(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_'); }
}
