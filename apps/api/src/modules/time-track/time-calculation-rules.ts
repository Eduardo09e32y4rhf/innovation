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
  incidentType: 'atraso' | 'saida_antecipada' | 'falta' | null;
  isRest: boolean;
  isHoliday: boolean;
  holidayHandling: 'FOLGA' | 'PAID_100';
  overtimeExceedsLimit: boolean;
  overtimeApprovalNeeded: boolean;
  absenceMinutes: number | null;
}

@Injectable()
export class TimeCalculationRulesService {
  calculateTotals(
    input: TimeCalculationInput,
    employee: any,
    rule: any,
    holiday: any,
  ): TimeCalculationOutput {
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
      isHoliday: !!holiday,
      holidayHandling: holiday?.handling ?? 'PAID_100',
      overtimeExceedsLimit: false,
      overtimeApprovalNeeded: false,
      absenceMinutes: null,
    };

    const workScale = rule?.workScale || '5x2';
    const dayOfWeek = input.workDate.getUTCDay();
    const restDays = rule?.restDaysOfWeek || [0, 6];

    if (restDays.includes(dayOfWeek)) {
      result.isRest = true;
    }

    if (holiday) {
      result.isHoliday = true;
      result.holidayHandling = holiday.handling;

      if (holiday.handling === 'FOLGA') {
        result.isRest = true;
      }
    }

    if (!input.entryTime || !input.exitTime) {
      if (result.isRest || this.isFullDayAdjustment(input.manualReason)) {
        return result;
      }
      result.incidentType = 'falta';
      const workloadMinutes = this.parseWorkloadMinutes(employee?.dailyWorkload) ?? (rule?.dailyMinutes || 480);
      result.absenceMinutes = workloadMinutes;
      result.dailyBalanceMinutes = -workloadMinutes;
      return result;
    }

    const gross = this.diffMinutes(input.entryTime, input.exitTime);
    let lunch = 0;
    if (input.lunchStartTime && input.lunchReturnTime) {
      lunch = this.diffMinutes(input.lunchStartTime, input.lunchReturnTime);
    } else {
      lunch = rule?.breakMinutes ?? 60;
    }
    result.totalWorkedMinutes = Math.max(gross - lunch, 0);

    const workloadMinutes = this.parseWorkloadMinutes(employee?.dailyWorkload) ?? (rule?.dailyMinutes || 480);
    result.dailyBalanceMinutes = result.totalWorkedMinutes - (result.isRest ? 0 : workloadMinutes);

    if (result.dailyBalanceMinutes > 0) {
      if (result.isHoliday && result.holidayHandling === 'PAID_100') {
        result.overtime100Minutes = result.dailyBalanceMinutes;
      } else if (result.isRest) {
        result.overtime100Minutes = result.dailyBalanceMinutes;
      } else {
        result.overtime50Minutes = result.dailyBalanceMinutes;
      }

      const maxDaily = rule?.maxDailyOvertimeMinutes ?? 120;
      if (result.overtime50Minutes > maxDaily || result.overtime100Minutes > maxDaily) {
        result.overtimeExceedsLimit = true;
        result.overtimeApprovalNeeded = true;
      }
    }

    if (result.dailyBalanceMinutes < 0 && !result.isRest) {
      const entryMin = input.entryTime.getHours() * 60 + input.entryTime.getMinutes();
      const exitMin = input.exitTime.getHours() * 60 + input.exitTime.getMinutes();
      const expectedEntry = this.timeStringToMinutes(rule?.standardEntry ?? '08:00');
      const expectedExit = this.timeStringToMinutes(rule?.standardExit ?? '17:00');
      
      const lateTolerance = rule?.lateToleranceMinutes ?? 10;
      const earlyTolerance = rule?.earlyLeaveToleranceMinutes ?? 10;

      if (entryMin > expectedEntry + lateTolerance) {
        result.lateMinutes = entryMin - expectedEntry;
        result.incidentType = 'atraso';
      } else if (exitMin < expectedExit - earlyTolerance) {
        result.earlyLeaveMinutes = expectedExit - exitMin;
        result.incidentType = 'saida_antecipada';
      }
    }

    if (rule?.nightShiftEnabled && input.entryTime && input.exitTime) {
      result.nightShiftMinutes = this.calculateNightShiftMinutes(
        input.entryTime,
        input.exitTime,
        rule.nightStartTime ?? '22:00',
        rule.nightEndTime ?? '05:00',
      );
    }

    return result;
  }

  private diffMinutes(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / 60000);
  }

  private timeStringToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private parseWorkloadMinutes(workloadStr?: string | null): number | null {
    if (!workloadStr) return null;
    const parts = workloadStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return null;
  }

  private calculateNightShiftMinutes(entry: Date, exit: Date, nightStart: string, nightEnd: string): number {
    const startMins = this.timeStringToMinutes(nightStart);
    const endMins = this.timeStringToMinutes(nightEnd);
    const eStartMins = entry.getHours() * 60 + entry.getMinutes();
    const eEndMins = exit.getHours() * 60 + exit.getMinutes();
    
    let nightMinutes = 0;
    
    if (startMins > endMins) {
      if (eStartMins >= startMins) {
        nightMinutes += (1440 - eStartMins);
      }
      if (eEndMins <= endMins) {
        nightMinutes += eEndMins;
      }
    } else {
      const overlapStart = Math.max(eStartMins, startMins);
      const overlapEnd = Math.min(eEndMins, endMins);
      if (overlapEnd > overlapStart) {
        nightMinutes = overlapEnd - overlapStart;
      }
    }
    return nightMinutes;
  }

  private isFullDayAdjustment(reason?: string | null): boolean {
    if (!reason) return false;
    const lower = reason.toLowerCase();
    return lower.includes('atestado') || lower.includes('licença') || lower.includes('abono');
  }
}
