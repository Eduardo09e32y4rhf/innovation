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
       if (workScale === '6x1' && dayOfWeek === 6) {
          const weekly = rule?.weeklyMinutes || 2640;
          expectedMinutes = weekly - (dailyMinutes * 5);
          if (expectedMinutes < 0) expectedMinutes = 0;
       } else if (workScale === '12x36') {
          expectedMinutes = 720;
       } else {
          expectedMinutes = dailyMinutes;
       }
    }

    const timestamps = [input.entryTime, input.lunchStartTime, input.lunchReturnTime, input.exitTime]
      .filter((t): t is Date => t !== null && t !== undefined)
      .sort((a, b) => a.getTime() - b.getTime());
    
    const entryTime = timestamps[0] || null;
    const lunchStartTime = timestamps.length >= 3 ? timestamps[1] : null;
    const lunchReturnTime = timestamps.length >= 4 ? timestamps[2] : null;
    const exitTime = timestamps.length === 2 ? timestamps[1] : timestamps[timestamps.length - 1] || null;

    const isFullDaySickLeave = this.isFullDaySickLeaveAdjustment(input.manualReason);

    if (isFullDaySickLeave) {
      result.punchStatus = 'JUSTIFIED ABSENCE';
      result.totalWorkedMinutes = 0;
      result.dailyBalanceMinutes = 0;
      result.absenceMinutes = null;
      return result;
    }

    if (timestamps.length === 4) {
      result.punchStatus = 'COMPLETE PUNCHES';
    } else if (timestamps.length > 0 && timestamps.length < 4) {
      result.punchStatus = 'INCOMPLETE PUNCHES';
    } else if (timestamps.length === 0 && !result.isRest && !result.isHoliday) {
      result.punchStatus = 'ABSENT';
    }

    if (!entryTime || !exitTime) {
      if (result.isRest || result.isHoliday || this.isFullDayAdjustment(input.manualReason)) {
        return result;
      }
      result.incidentType = 'falta';
      result.absenceMinutes = expectedMinutes;
      result.dailyBalanceMinutes = -expectedMinutes;
      return result;
    }

    const p1 = this.diffMinutes(entryTime, lunchStartTime || exitTime);
    const p2 = (lunchReturnTime && timestamps.length === 4) ? this.diffMinutes(lunchReturnTime, exitTime) : 0;
    
    let lunch = 0;
    if (lunchStartTime && lunchReturnTime) {
      lunch = this.diffMinutes(lunchStartTime, lunchReturnTime);
    } else {
      lunch = rule?.breakMinutes ?? 60;
    }
    
    let workedMinutes = 0;
    if (timestamps.length === 4) {
        workedMinutes = p1 + p2;
    } else if (timestamps.length === 2) {
        const gross = this.diffMinutes(entryTime, exitTime);
        workedMinutes = Math.max(gross - lunch, 0);
    } else {
        const gross = this.diffMinutes(entryTime, exitTime);
        workedMinutes = Math.max(gross - lunch, 0);
    }
    
    if (result.isRest || result.isHoliday || this.isFullDayAdjustment(input.manualReason)) {
       result.totalWorkedMinutes = null;
       result.dailyBalanceMinutes = null;
       if (workedMinutes > 0) {
           result.totalWorkedMinutes = workedMinutes;
           result.overtime100Minutes = workedMinutes;
           result.dailyBalanceMinutes = workedMinutes;
       }
       return result;
    }

    result.totalWorkedMinutes = workedMinutes;

    let balance = workedMinutes - expectedMinutes;
    if (Math.abs(balance) <= this.TOLERANCIA_DIARIA_MINUTOS) {
       balance = 0;
    }
    
    const isPartialAtestado = (input.manualReason || '').toLowerCase().includes('atestado') || 
                              (input.manualReason || '').toLowerCase().includes('abono');
    
    if (balance < 0 && isPartialAtestado) {
       balance = 0;
    }

    result.dailyBalanceMinutes = balance;

    if (balance > 0) {
      result.overtime50Minutes = balance;

      const maxDaily = rule?.maxDailyOvertimeMinutes ?? 120;
      if (result.overtime50Minutes > maxDaily) {
        result.overtimeExceedsLimit = true;
        result.overtimeApprovalNeeded = true;
      }
    } else if (balance < 0) {
        const expectedEntryMin = this.timeStringToMinutes(employee?.standardEntry || rule?.standardEntry || '08:00');
        const entryMin = entryTime.getHours() * 60 + entryTime.getMinutes();
        const lateTolerance = rule?.lateToleranceMinutes ?? 10;

        if (entryMin > expectedEntryMin + lateTolerance) {
             result.incidentType = 'DELAY';
        } else {
             result.incidentType = 'EARLY DEPARTURE';
        }
    }

    const expectedEntryMin = this.timeStringToMinutes(employee?.standardEntry || rule?.standardEntry || '08:00');
    const lateTolerance = rule?.lateToleranceMinutes ?? 10;
    const earlyTolerance = rule?.earlyLeaveToleranceMinutes ?? 10;
    const breakMins = rule?.breakMinutes ?? 60;
    
    let expectedExitStr = employee?.standardExit || rule?.standardExit;
    if (!expectedExitStr) {
      const derivedExit = expectedEntryMin + expectedMinutes + (expectedMinutes > 360 ? breakMins : 0);
      expectedExitStr = `${String(Math.floor(derivedExit/60)).padStart(2,'0')}:${String(derivedExit%60).padStart(2,'0')}`;
    }
    const expectedExitMin = this.timeStringToMinutes(expectedExitStr);

    const entryMin = entryTime.getHours() * 60 + entryTime.getMinutes();
    const exitMin = exitTime.getHours() * 60 + exitTime.getMinutes();

    const incidents: string[] = [];
    let calcLate = 0;
    let calcEarly = 0;

    if (entryMin > expectedEntryMin + lateTolerance) {
      incidents.push('atraso');
      calcLate += (entryMin - expectedEntryMin);
    }
    
    if (lunch > breakMins + lateTolerance) {
      incidents.push('atraso_pausa');
      calcLate += (lunch - breakMins);
    }

    if (exitMin < expectedExitMin - earlyTolerance) {
      incidents.push('saida_antecipada');
      calcEarly += (expectedExitMin - exitMin);
    }

    if (incidents.length > 0) {
      result.incidentType = incidents.join(', ');
    } else if (balance < 0) {
      result.incidentType = result.incidentType || 'atraso';
    } else {
      result.incidentType = 'normal';
    }

    result.lateMinutes = calcLate;
    result.earlyLeaveMinutes = calcEarly;

    if (balance < 0) {
      result.absenceMinutes = Math.abs(balance);
      if (incidents.length === 0) {
        result.lateMinutes = Math.abs(balance);
      }
    }

    if (rule?.nightShiftEnabled && entryTime && exitTime) {
      result.nightShiftMinutes = this.calculateNightShiftMinutes(
        entryTime,
        exitTime,
        rule.nightStartTime ?? '22:00',
        rule.nightEndTime ?? '05:00',
      );
    }

    result.sortedTimestamps = { entryTime, lunchStartTime, lunchReturnTime, exitTime };

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

      if (day.dailyBalanceMinutes !== null && day.dailyBalanceMinutes < 0) {
          totalDelaysAbsencesDebt += Math.abs(day.dailyBalanceMinutes);
      } else if (day.absenceMinutes && day.absenceMinutes > 0 && day.punchStatus !== 'JUSTIFIED ABSENCE') {
          totalDelaysAbsencesDebt += day.absenceMinutes;
      }

      if (day.totalWorkedMinutes && day.totalWorkedMinutes > 0 && day.punchStatus !== 'JUSTIFIED ABSENCE') {
          daysWorked++;
      }

      if (day.punchStatus === 'ABSENT') {
          fullAbsences++;
      }
    }

    const totalOvertime = totalOvertime50 + totalOvertime100;
    const timeBankBalance = totalOvertime - totalDelaysAbsencesDebt;

    return {
      totalOvertime50,
      totalOvertime100,
      totalOvertime,
      totalDelaysAbsencesDebt,
      timeBankBalance,
      daysWorked,
      fullAbsences
    };
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

  private isFullDaySickLeaveAdjustment(reason?: string | null): boolean {
    if (!reason) return false;
    const lower = reason.toLowerCase();
    return lower === 'sick leave' || lower.includes('atestado integral') || lower.includes('licença médica');
  }
}
