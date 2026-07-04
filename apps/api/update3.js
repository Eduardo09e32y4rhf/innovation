const fs = require('fs');
let code = fs.readFileSync('src/modules/time-track/time-track.service.ts', 'utf8');
code = code.replace(/\r\n/g, '\n');

const oldCalc = `  private calculateTotals(
    track: { entry?: Date | null; lunchStart?: Date | null; lunchReturn?: Date | null; exit?: Date | null; manualReason?: string | null; observation?: string | null },
    employee?: { workScale?: string | null; dailyWorkload?: string | null; standardEntry?: string | null; standardExit?: string | null },
    date?: Date
  ) {
    if (!track.entry || !track.exit) return { totalWorked: null, dailyBalance: null, overtime50Minutes: null, overtime100Minutes: null, nightShiftMinutes: null, incidentType: null };
    const gross = this.diffMinutes(track.entry, track.exit);
    const lunch = track.lunchStart && track.lunchReturn ? this.diffMinutes(track.lunchStart, track.lunchReturn) : 0;
    const totalWorked = Math.max(gross - lunch, 0);
    
    let isRest = false;
    if (date) {
      const wd = date.getUTCDay();
      const s = employee?.workScale;
      if (s === '5X2' && (wd === 0 || wd === 6)) isRest = true;
      if (s === '6X1' && wd === 0) isRest = true;
    }
    const o = (track.observation ?? '').toLowerCase();
    const r = (track.manualReason ?? '').toLowerCase();
    if (o.includes('folga') || o.includes('feriado') || r.includes('folga') || r.includes('feriado')) {
      isRest = true;
    }

    const workload = isRest ? 0 : parseWorkloadToMinutes(employee?.dailyWorkload);
    const dailyBalance = totalWorked - workload;

    let overtime50Minutes = 0;
    let overtime100Minutes = 0;
    let nightShiftMinutes = 0;
    let incidentType: string | null = null;

    if (dailyBalance > 0) {
      if (isRest) {
        overtime100Minutes = dailyBalance;
      } else {
        overtime50Minutes = dailyBalance;
      }
    } else if (dailyBalance < 0 && !isRest) {
      const getMin = (d: Date) => d.getHours() * 60 + d.getMinutes();
      const actualEntry = getMin(track.entry);
      const actualExit = getMin(track.exit);
      const stdEntry = timeToMinutes(employee?.standardEntry);
      const stdExit = timeToMinutes(employee?.standardExit);
      
      if (stdEntry !== null && actualEntry > stdEntry + TOLERANCE_MINUTES) {
        incidentType = 'atraso';
      } else if (stdExit !== null && actualExit < stdExit - TOLERANCE_MINUTES) {
        incidentType = 'saida_antecipada';
      }
    }

    const getMin = (d: Date) => d.getHours() * 60 + d.getMinutes();
    const s = getMin(track.entry);
    const e = getMin(track.exit) + (track.entry.getDate() !== track.exit.getDate() ? 24 * 60 : 0);
    
    const nightStart = 22 * 60; // 1320
    const nightEnd = 24 * 60 + 5 * 60; // 1740

    if (e > nightStart) {
      const overlapStart = Math.max(s, nightStart);
      const overlapEnd = Math.min(e, nightEnd);
      if (overlapEnd > overlapStart) nightShiftMinutes += (overlapEnd - overlapStart);
    }
    if (s < 5 * 60) {
      const overlapStart = s;
      const overlapEnd = Math.min(e, 5 * 60);
      if (overlapEnd > overlapStart) nightShiftMinutes += (overlapEnd - overlapStart);
    }

    return { totalWorked, dailyBalance, overtime50Minutes, overtime100Minutes, nightShiftMinutes, incidentType };
  }`;

const newCalc = `  private async calculateTotals(
    companyId: string,
    track: { entry?: Date | null; lunchStart?: Date | null; lunchReturn?: Date | null; exit?: Date | null; manualReason?: string | null; observation?: string | null },
    employee?: { id: string, workScale?: string | null; dailyWorkload?: string | null; standardEntry?: string | null; standardExit?: string | null, workScheduleRuleId?: string | null },
    date?: Date
  ) {
    if (!track.entry || !track.exit) return { totalWorked: null, dailyBalance: null, overtime50Minutes: null, overtime100Minutes: null, nightShiftMinutes: null, incidentType: null, overtimeExceedsLimit: false };
    const gross = this.diffMinutes(track.entry, track.exit);
    const lunch = track.lunchStart && track.lunchReturn ? this.diffMinutes(track.lunchStart, track.lunchReturn) : 0;
    const totalWorked = Math.max(gross - lunch, 0);
    
    let isRest = false;
    let isHoliday = false;
    if (date) {
      const wd = date.getUTCDay();
      const s = employee?.workScale;
      if (s === '5X2' && (wd === 0 || wd === 6)) isRest = true;
      if (s === '6X1' && wd === 0) isRest = true;
      
      const holiday = await this.repository.findHoliday(companyId, date);
      if (holiday) {
        isHoliday = true;
        isRest = true;
      }
    }
    const o = (track.observation ?? '').toLowerCase();
    const r = (track.manualReason ?? '').toLowerCase();
    if (o.includes('folga') || o.includes('feriado') || r.includes('folga') || r.includes('feriado')) {
      isRest = true;
    }

    const rule = employee?.workScheduleRuleId ? await this.repository.findWorkScheduleRule(employee.workScheduleRuleId) : null;
    const tolerance = rule?.lateToleranceMinutes ?? TOLERANCE_MINUTES;
    const earlyTolerance = rule?.earlyLeaveToleranceMinutes ?? TOLERANCE_MINUTES;
    const overtimeTolerance = rule?.overtimeToleranceMinutes ?? 0;
    const overtimeEnabled = rule?.overtimeEnabled ?? true;
    const maxDailyOvertime = rule?.maxDailyOvertimeMinutes ?? 120;

    const workload = isRest ? 0 : parseWorkloadToMinutes(employee?.dailyWorkload);
    const dailyBalance = totalWorked - workload;

    let overtime50Minutes = 0;
    let overtime100Minutes = 0;
    let nightShiftMinutes = 0;
    let incidentType: string | null = null;
    let overtimeExceedsLimit = false;

    if (dailyBalance > overtimeTolerance) {
      if (overtimeEnabled) {
        if (isRest || isHoliday) {
          overtime100Minutes = dailyBalance;
        } else {
          overtime50Minutes = dailyBalance;
        }
        if (dailyBalance > maxDailyOvertime) {
          overtimeExceedsLimit = true;
        }
      }
    } else if (dailyBalance < 0 && !isRest) {
      const getMin = (d: Date) => d.getHours() * 60 + d.getMinutes();
      const actualEntry = getMin(track.entry);
      const actualExit = getMin(track.exit);
      const stdEntry = timeToMinutes(employee?.standardEntry);
      const stdExit = timeToMinutes(employee?.standardExit);
      
      if (stdEntry !== null && actualEntry > stdEntry + tolerance) {
        incidentType = 'atraso';
      } else if (stdExit !== null && actualExit < stdExit - earlyTolerance) {
        incidentType = 'saida_antecipada';
      }
    }

    const getMin = (d: Date) => d.getHours() * 60 + d.getMinutes();
    const s = getMin(track.entry);
    const e = getMin(track.exit) + (track.entry.getDate() !== track.exit.getDate() ? 24 * 60 : 0);
    
    let nightStart = 22 * 60; // 1320
    let nightEnd = 24 * 60 + 5 * 60; // 1740
    
    if (rule?.nightShiftEnabled && rule.nightStartTime && rule.nightEndTime) {
      const parsedStart = timeToMinutes(rule.nightStartTime);
      const parsedEnd = timeToMinutes(rule.nightEndTime);
      if (parsedStart !== null && parsedEnd !== null) {
        nightStart = parsedStart;
        nightEnd = parsedEnd < parsedStart ? parsedEnd + 24 * 60 : parsedEnd;
      }
    }

    if (e > nightStart) {
      const overlapStart = Math.max(s, nightStart);
      const overlapEnd = Math.min(e, nightEnd);
      if (overlapEnd > overlapStart) nightShiftMinutes += (overlapEnd - overlapStart);
    }
    if (s < nightEnd - 24 * 60) {
      const overlapStart = s;
      const overlapEnd = Math.min(e, nightEnd - 24 * 60);
      if (overlapEnd > overlapStart) nightShiftMinutes += (overlapEnd - overlapStart);
    }

    return { totalWorked, dailyBalance, overtime50Minutes, overtime100Minutes, nightShiftMinutes, incidentType, overtimeExceedsLimit };
  }`;

if (code.includes(oldCalc)) {
    code = code.replace(oldCalc, newCalc);
    fs.writeFileSync('src/modules/time-track/time-track.service.ts', code);
    console.log('Replaced successfully');
} else {
    console.log("Could not find calculateTotals");
}
