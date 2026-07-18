import { Injectable } from '@nestjs/common';

export interface TimeCalculationInput {
  entryTime?: Date | null;
  lunchStartTime?: Date | null;
  lunchReturnTime?: Date | null;
  exitTime?: Date | null;
  workDate: Date;
  manualReason?: string | null;
}

export interface TimeCalculationOutput {
  totalWorkedMinutes: number | null;
  dailyBalanceMinutes: number | null;
  overtime50Minutes: number;
  overtime100Minutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  nightShiftMinutes: number;
  incidentType: string | null;
  isRest: boolean;
  isHoliday: boolean;
  holidayHandling: 'FOLGA' | 'PAID_100';
  overtimeExceedsLimit: boolean;
  overtimeApprovalNeeded: boolean;
  absenceMinutes: number | null;
  sortedTimestamps?: {
    entryTime: Date | null;
    lunchStartTime: Date | null;
    lunchReturnTime: Date | null;
    exitTime: Date | null;
  };
  punchStatus?: 'COMPLETE PUNCHES' | 'INCOMPLETE PUNCHES' | 'ABSENT' | 'JUSTIFIED ABSENCE';
}

export interface MonthlyConsolidationOutput {
  totalOvertime50: number;
  totalOvertime100: number;
  totalOvertime: number;
  totalDelaysAbsencesDebt: number;
  timeBankBalance: number;
  daysWorked: number;
  fullAbsences: number;
}

@Injectable()
export class TimeCalculationRulesService {
  private readonly legalPunchToleranceMinutes = 5;
  private readonly legalDailyToleranceMinutes = 10;
  private readonly timezone = 'America/Sao_Paulo';

  calculateTotals(input: TimeCalculationInput, employee: any, rule: any, holiday: any): TimeCalculationOutput {
    const result: TimeCalculationOutput = {
      totalWorkedMinutes: null,
      dailyBalanceMinutes: null,
      overtime50Minutes: 0,
      overtime100Minutes: 0,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      nightShiftMinutes: 0,
      incidentType: null,
      isRest: false,
      isHoliday: Boolean(holiday),
      holidayHandling: holiday?.handling === 'FOLGA' ? 'FOLGA' : 'PAID_100',
      overtimeExceedsLimit: false,
      overtimeApprovalNeeded: false,
      absenceMinutes: null,
    };

    const workScale = String(rule?.workScale || employee?.workScale || '5x2').toLowerCase();
    const dayOfWeek = input.workDate.getUTCDay();
    const restDays = Array.isArray(rule?.restDaysOfWeek)
      ? rule.restDaysOfWeek
      : workScale === '6x1' ? [0] : [0, 6];
    result.isRest = restDays.includes(dayOfWeek);

    if (input.manualReason === 'ajuste_feriado') {
      result.isHoliday = true;
      result.holidayHandling = 'PAID_100';
    }
    if (input.manualReason === 'ajuste_folga_dsr' || input.manualReason === 'ajuste_abono_folga') {
      result.isRest = true;
    }

    const isTwelveByThirtySix = workScale === '12x36';
    const holidayRequiresDoublePay = result.isHoliday && !isTwelveByThirtySix && result.holidayHandling === 'PAID_100';
    if (result.isHoliday && result.holidayHandling === 'FOLGA') result.isRest = true;

    const employeeDaily = this.durationStringToMinutes(employee?.dailyWorkload);
    let expectedMinutes = Number(rule?.dailyMinutes || employeeDaily || 480);
    if (isTwelveByThirtySix) expectedMinutes = Number(rule?.cycleWorkHours || 12) * 60;
    if (result.isRest || holidayRequiresDoublePay) expectedMinutes = 0;

    const timestamps = [input.entryTime, input.lunchStartTime, input.lunchReturnTime, input.exitTime]
      .filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    const entryTime = timestamps[0] ?? null;
    const lunchStartTime = timestamps.length >= 3 ? timestamps[1] : null;
    const lunchReturnTime = timestamps.length >= 4 ? timestamps[2] : null;
    const exitTime = timestamps.length >= 2 ? timestamps[timestamps.length - 1] : null;
    result.sortedTimestamps = { entryTime, lunchStartTime, lunchReturnTime, exitTime };

    if (this.isFullDaySickLeaveAdjustment(input.manualReason)) {
      result.punchStatus = 'JUSTIFIED ABSENCE';
      result.totalWorkedMinutes = 0;
      result.dailyBalanceMinutes = 0;
      return result;
    }

    if (timestamps.length === 4 || timestamps.length === 2) result.punchStatus = 'COMPLETE PUNCHES';
    else if (timestamps.length > 0) result.punchStatus = 'INCOMPLETE PUNCHES';
    else if (!result.isRest && !holidayRequiresDoublePay) result.punchStatus = 'ABSENT';

    if (!entryTime || !exitTime) {
      if (result.isRest || holidayRequiresDoublePay || this.isFullDayAdjustment(input.manualReason)) return result;
      result.incidentType = 'falta';
      result.absenceMinutes = expectedMinutes;
      result.dailyBalanceMinutes = -expectedMinutes;
      return result;
    }

    const intervals = lunchStartTime && lunchReturnTime
      ? [[entryTime, lunchStartTime], [lunchReturnTime, exitTime]] as Array<[Date, Date]>
      : [[entryTime, exitTime]] as Array<[Date, Date]>;
    const grossWorkedMinutes = intervals.reduce((sum, [start, end]) => sum + this.diffMinutes(start, end), 0);
    const configuredBreak = Number(rule?.breakMinutes ?? 60);
    const workedMinutes = lunchStartTime && lunchReturnTime
      ? grossWorkedMinutes
      : Math.max(0, grossWorkedMinutes - (expectedMinutes > 360 ? configuredBreak : 0));
    result.totalWorkedMinutes = workedMinutes;

    const nightActualMinutes = rule?.nightShiftEnabled || employee?.isNightShift
      ? this.calculateNightMinutes(intervals, rule?.nightStartTime ?? '22:00', rule?.nightEndTime ?? '05:00')
      : 0;
    result.nightShiftMinutes = Math.round(nightActualMinutes * (60 / 52.5));

    if (result.isRest || holidayRequiresDoublePay) {
      result.dailyBalanceMinutes = workedMinutes;
      result.overtime100Minutes = workedMinutes;
      result.incidentType = workedMinutes > 0 ? 'hora_extra_100' : 'normal';
      this.applyOvertimeLimit(result, rule);
      return result;
    }

    const expectedEntry = this.timeStringToMinutes(employee?.standardEntry || rule?.standardEntry || '08:00');
    const expectedExit = this.resolveExpectedExit(employee, rule, expectedEntry, expectedMinutes, configuredBreak);
    const expectedLunchStart = this.optionalTimeToMinutes(employee?.standardLunchStart || rule?.standardLunchStart);
    const expectedLunchReturn = this.optionalTimeToMinutes(employee?.standardLunchReturn || rule?.standardLunchReturn);
    const actualEntry = this.localMinuteOfDay(entryTime);
    const actualExit = this.localMinuteOfDay(exitTime);
    const actualLunchStart = lunchStartTime ? this.localMinuteOfDay(lunchStartTime) : null;
    const actualLunchReturn = lunchReturnTime ? this.localMinuteOfDay(lunchReturnTime) : null;

    const lateDeviations = [
      this.forwardDifference(expectedEntry, actualEntry),
      expectedLunchReturn !== null && actualLunchReturn !== null ? this.forwardDifference(expectedLunchReturn, actualLunchReturn) : 0,
    ].filter((value) => value > 0);
    const earlyDeviations = [
      this.forwardDifference(actualExit, expectedExit),
      expectedLunchStart !== null && actualLunchStart !== null ? this.forwardDifference(actualLunchStart, expectedLunchStart) : 0,
    ].filter((value) => value > 0);
    const overtimeDeviations = [
      this.forwardDifference(actualEntry, expectedEntry),
      this.forwardDifference(expectedExit, actualExit),
    ].filter((value) => value > 0);

    let balance = workedMinutes - expectedMinutes;
    const negativeDeviations = [...lateDeviations, ...earlyDeviations];
    if (balance < 0 && this.withinLegalTolerance(negativeDeviations, rule)) balance = 0;
    if (balance > 0 && this.withinLegalTolerance(overtimeDeviations, rule)) balance = 0;
    const isJustified = this.isPartialJustification(input.manualReason);
    if (balance < 0 && isJustified) balance = 0;

    result.dailyBalanceMinutes = balance;
    result.lateMinutes = isJustified ? 0 : this.countDeviation(lateDeviations, rule);
    result.earlyLeaveMinutes = isJustified ? 0 : this.countDeviation(earlyDeviations, rule);
    result.overtime50Minutes = this.countDeviation(overtimeDeviations, rule);

    const scheduleDebt = result.lateMinutes + result.earlyLeaveMinutes;
    const netDebt = Math.max(0, -balance);
    result.absenceMinutes = Math.max(scheduleDebt, netDebt) || null;

    if (result.overtime50Minutes > 0) this.applyOvertimeLimit(result, rule);

    if (result.earlyLeaveMinutes > 0 && result.lateMinutes > 0) result.incidentType = 'atraso_saida_antecipada';
    else if (result.earlyLeaveMinutes > 0) result.incidentType = 'saida_antecipada';
    else if (result.lateMinutes > 0) result.incidentType = 'atraso';
    else if (balance < 0) result.incidentType = 'debito_jornada';
    else if (result.overtime50Minutes > 0) result.incidentType = 'hora_extra_50';
    else result.incidentType = 'normal';

    return result;
  }

  consolidateMonthly(days: TimeCalculationOutput[]): MonthlyConsolidationOutput {
    let totalOvertime50 = 0;
    let totalOvertime100 = 0;
    let totalDelaysAbsencesDebt = 0;
    let daysWorked = 0;
    let fullAbsences = 0;
    for (const day of days) {
      totalOvertime50 += day.overtime50Minutes || 0;
      totalOvertime100 += day.overtime100Minutes || 0;
      if ((day.dailyBalanceMinutes ?? 0) < 0) totalDelaysAbsencesDebt += Math.abs(day.dailyBalanceMinutes!);
      if ((day.totalWorkedMinutes ?? 0) > 0 && day.punchStatus !== 'JUSTIFIED ABSENCE') daysWorked++;
      if (day.punchStatus === 'ABSENT') fullAbsences++;
    }
    const totalOvertime = totalOvertime50 + totalOvertime100;
    return {
      totalOvertime50,
      totalOvertime100,
      totalOvertime,
      totalDelaysAbsencesDebt,
      timeBankBalance: totalOvertime - totalDelaysAbsencesDebt,
      daysWorked,
      fullAbsences,
    };
  }

  private applyOvertimeLimit(result: TimeCalculationOutput, rule: any): void {
    const total = result.overtime50Minutes + result.overtime100Minutes;
    const maximum = Math.min(120, Number(rule?.maxDailyOvertimeMinutes ?? 120));
    if (total > maximum) {
      result.overtimeExceedsLimit = true;
      result.overtimeApprovalNeeded = true;
    }
  }

  private withinLegalTolerance(deviations: number[], rule: any): boolean {
    if (!deviations.length) return false;
    const configured = Number(rule?.lateToleranceMinutes ?? this.legalPunchToleranceMinutes);
    const perPunch = Math.min(this.legalPunchToleranceMinutes, Math.max(0, configured));
    return deviations.every((value) => value <= perPunch)
      && deviations.reduce((sum, value) => sum + value, 0) <= this.legalDailyToleranceMinutes;
  }

  private countDeviation(deviations: number[], rule: any): number {
    return this.withinLegalTolerance(deviations, rule) ? 0 : deviations.reduce((sum, value) => sum + value, 0);
  }

  private calculateNightMinutes(intervals: Array<[Date, Date]>, nightStart: string, nightEnd: string): number {
    const start = this.timeStringToMinutes(nightStart);
    const end = this.timeStringToMinutes(nightEnd);
    let total = 0;
    for (const [intervalStart, intervalEnd] of intervals) {
      const startMinute = this.localMinuteOfDay(intervalStart);
      const endMinute = this.localMinuteOfDay(intervalEnd);
      const startDate = this.localDateKey(intervalStart);
      const endDate = this.localDateKey(intervalEnd);
      const coversFullUrbanNight = start > end
        && startDate !== endDate
        && startMinute <= start
        && endMinute > end
        && this.diffMinutes(intervalStart, intervalEnd) >= (1440 - start) + end;
      for (let cursor = intervalStart.getTime(); cursor < intervalEnd.getTime(); cursor += 60000) {
        const instant = new Date(cursor);
        const minute = this.localMinuteOfDay(instant);
        const isNight = start > end ? minute >= start || minute < end : minute >= start && minute < end;
        const isNightExtension = coversFullUrbanNight
          && this.localDateKey(instant) === endDate
          && minute >= end
          && minute < 720;
        if (isNight || isNightExtension) total++;
      }
    }
    return total;
  }

  private resolveExpectedExit(employee: any, rule: any, entry: number, expected: number, breakMinutes: number): number {
    const explicit = employee?.standardExit || rule?.standardExit;
    if (explicit) return this.timeStringToMinutes(explicit);
    return (entry + expected + (expected > 360 ? breakMinutes : 0)) % 1440;
  }

  private localParts(date: Date): Record<string, number> {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
    }).formatToParts(date);
    const values: Record<string, number> = {};
    for (const part of parts) if (part.type !== 'literal') values[part.type] = Number(part.value);
    const weekday = parts.find((part) => part.type === 'weekday')?.value;
    values.weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday ?? '');
    return values;
  }

  private localDateKey(date: Date): string {
    const parts = this.localParts(date);
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  }
  private localMinuteOfDay(date: Date): number {
    const parts = this.localParts(date);
    return parts.hour * 60 + parts.minute;
  }

  private localDayOfWeek(date: Date): number {
    return this.localParts(date).weekday;
  }

  private forwardDifference(from: number, to: number): number {
    const diff = (to - from + 1440) % 1440;
    return diff > 720 ? 0 : diff;
  }

  private diffMinutes(start: Date, end: Date): number {
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }

  private optionalTimeToMinutes(value?: string | null): number | null {
    return value ? this.timeStringToMinutes(value) : null;
  }

  private timeStringToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  private durationStringToMinutes(value?: string | null): number | null {
    if (!value) return null;
    const [hours, minutes] = value.split(':').map(Number);
    if (!Number.isFinite(hours)) return null;
    return hours * 60 + (minutes || 0);
  }

  private isPartialJustification(reason?: string | null): boolean {
    const normalized = String(reason || '').toLowerCase();
    return normalized.includes('atestado') || normalized.includes('abono');
  }

  private isFullDayAdjustment(reason?: string | null): boolean {
    const normalized = String(reason || '').toLowerCase();
    return normalized.includes('atestado') || normalized.includes('licenca') || normalized.includes('licença') || normalized.includes('abono');
  }

  private isFullDaySickLeaveAdjustment(reason?: string | null): boolean {
    const normalized = String(reason || '').toLowerCase();
    return normalized === 'sick leave' || normalized.includes('atestado integral') || normalized.includes('licenca medica') || normalized.includes('licença médica');
  }
}
