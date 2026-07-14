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
  private readonly TOLERANCIA_DIARIA_MINUTOS = 10;
  
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

    const workScale = (rule?.workScale || employee?.workScale || '5x2').toLowerCase();
    const dayOfWeek = input.workDate.getUTCDay();
    let restDays = rule?.restDaysOfWeek || (workScale === '6x1' ? [0] : [0, 6]);

    if (workScale === '6x1' && restDays.includes(6)) {
      restDays = restDays.filter((d: number) => d !== 6);
    }

    // Determine if it's a rest day based on standard rules
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

    if (input.manualReason === 'ajuste_feriado') {
      result.isHoliday = true;
      result.holidayHandling = 'PAID_100';
    }
    if (input.manualReason === 'ajuste_folga_dsr' || input.manualReason === 'ajuste_abono_folga') {
      result.isRest = true;
    }

    let expectedMinutes = 0;
    const empDaily = employee?.dailyWorkload ? (parseInt(employee.dailyWorkload.split(':')[0]) * 60 + parseInt(employee.dailyWorkload.split(':')[1] || '0')) : 480;
    const dailyMinutes = rule?.dailyMinutes || empDaily;
    
    if (!result.isRest && !result.isHoliday) {
       if (workScale === '6x1' && dayOfWeek === 6) { // Saturday in 6x1
          const weekly = rule?.weeklyMinutes || 2640; // 44h
          expectedMinutes = weekly - (dailyMinutes * 5);
          if (expectedMinutes < 0) expectedMinutes = 0;
       } else if (workScale === '12x36') {
          // Since we don't have alternate tracking yet, we'll assume 720 if not explicitly marked as rest.
          expectedMinutes = 720;
       } else {
          expectedMinutes = dailyMinutes;
       }
    }

    // If completely missing (falta)
    if (!input.entryTime || !input.exitTime) {
      if (result.isRest || result.isHoliday || this.isFullDayAdjustment(input.manualReason)) {
        return result;
      }
      result.incidentType = 'falta';
      result.absenceMinutes = expectedMinutes;
      result.dailyBalanceMinutes = -expectedMinutes;
      return result;
    }

    // Calculate actual worked minutes
    const gross = this.diffMinutes(input.entryTime, input.exitTime);
    let lunch = 0;
    if (input.lunchStartTime && input.lunchReturnTime) {
      lunch = this.diffMinutes(input.lunchStartTime, input.lunchReturnTime);
    } else {
      lunch = rule?.breakMinutes ?? 60;
    }
    
    const workedMinutes = Math.max(gross - lunch, 0);
    result.totalWorkedMinutes = workedMinutes;

    // Apply exact tolerance
    let balance = workedMinutes - expectedMinutes;
    if (Math.abs(balance) <= this.TOLERANCIA_DIARIA_MINUTOS) {
       balance = 0;
    }
    
    result.dailyBalanceMinutes = balance;

    if (balance > 0) {
      if (result.isHoliday && result.holidayHandling === 'PAID_100') {
        result.overtime100Minutes = balance;
      } else if (result.isRest) {
        result.overtime100Minutes = balance;
      } else {
        result.overtime50Minutes = balance;
      }

      const maxDaily = rule?.maxDailyOvertimeMinutes ?? 120;
      if (result.overtime50Minutes > maxDaily || result.overtime100Minutes > maxDaily) {
        result.overtimeExceedsLimit = true;
        result.overtimeApprovalNeeded = true;
      }
    }

    if (balance < 0 && !result.isRest) {
      // Missing time
      const missing = Math.abs(balance);
      const entryMin = input.entryTime.getHours() * 60 + input.entryTime.getMinutes();
      const expectedEntry = this.timeStringToMinutes(rule?.standardEntry ?? '08:00');
      const lateTolerance = rule?.lateToleranceMinutes ?? 10;
      
      // Determine if it was late arrival or early leave for the report
      if (entryMin > expectedEntry + lateTolerance) {
        result.lateMinutes = missing;
        result.incidentType = 'atraso';
      } else {
        result.earlyLeaveMinutes = missing;
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
