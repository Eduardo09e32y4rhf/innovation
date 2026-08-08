import { Employee, TimeTrack, TimeTrackAdjustmentReason } from '@/app/lib/api';
import { formatMinutes } from '@/app/lib/format';
import { saoPauloDateKey } from '@/app/lib/date';

export const WEEKDAYS = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

export const REASONS: { value: TimeTrackAdjustmentReason; label: string; fullDay?: boolean }[] = [
  { value:'ajuste_erro_marcacao', label:'AJUSTE - MARCAÇÃO INCOMPLETA', fullDay:false },
  { value:'ajuste_atestado_integral', label:'ATESTADO INTEGRAL', fullDay:true },
  { value:'ajuste_feriado', label:'FERIADO', fullDay:true },
  { value:'ajuste_abono_atestado_horas', label:'ABONO - ATESTADO DE HORAS', fullDay:false },
  { value:'ajuste_folga_dsr', label:'FOLGA', fullDay:true },
  { value:'ajuste_abono_folga', label:'ABONO - FOLGA (BANCO)', fullDay:true },
  { value:'ajuste_abono_banco_saida_antecipada', label:'ABONO - BANCO SAÍDA ANTECIPADA', fullDay:true },
  { value:'ajuste_abono_atraso', label:'ABONO - ATRASO', fullDay:true },
  { value:'ajuste_suspensao', label:'SUSPENSÃO', fullDay:true },
];

export function getLocalToday() {
  return saoPauloDateKey();
}
export function toDateKey(v?: string | null) { return v ? v.slice(0,10) : ''; }
export function fmtTime(v?: string | null) {
  if (!v) return '--:--';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('pt-BR',{ hour:'2-digit', minute:'2-digit' });
}
export function fmtLunch(s?: string|null, e?: string|null) {
  if (!s && !e) return '--:--';
  return `${fmtTime(s)} - ${fmtTime(e)}`;
}
export function fmtWorked(m?: number|null) { return m == null ? '--:--' : formatMinutes(m); }
export function fmtBalance(m?: number|null) { return m == null ? '--:--' : formatMinutes(m); }

export function fmtDateFull(v?: string | null): string {
  if (!v) return '---';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '---';
  const wd = WEEKDAYS[d.getUTCDay()] ?? '---';
  const dd = String(d.getUTCDate()).padStart(2,'0');
  const mm = String(d.getUTCMonth()+1).padStart(2,'0');
  const yy = d.getUTCFullYear();
  return `${wd} - ${dd}/${mm}/${yy}`;
}

export function isRestDay(date: Date, emp: Employee): boolean {
  const wd = date.getUTCDay();
  if (emp.workScheduleRule?.restDaysOfWeek && emp.workScheduleRule.restDaysOfWeek.length > 0) {
    return emp.workScheduleRule.restDaysOfWeek.includes(wd);
  }
  const s = emp.workScale; const c = emp.customWorkScale;
  if (s==='5X2') return wd===0||wd===6;
  if (s==='6X1') return wd===0;
  if (s==='4X2') return isCycle(date,emp,4,2);
  if (s==='12X36') return isCycle(date,emp,1,1);
  if (s==='OUTRO' && c) {
    const m = c.match(/(\d+)X(\d+)/i);
    if (m) return isCycle(date,emp,parseInt(m[1],10),parseInt(m[2],10));
  }
  return wd===0;
}
export function isCycle(date: Date, emp: Employee, work: number, off: number) {
  const adm = emp.admissionDate ? new Date(emp.admissionDate) : new Date('2020-01-01');
  const a = Date.UTC(adm.getUTCFullYear(), adm.getUTCMonth(), adm.getUTCDate());
  const b = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const diff = Math.floor((b-a)/864e5);
  if (diff<0) return false;
  return (diff%(work+off)) >= work;
}
export function isAntesAdmissao(key: string, emp: Employee): boolean {
  if (!emp.admissionDate) return false;
  const adm = emp.admissionDate.slice(0,10);
  return key < adm;
}
export function isDepoisDemissao(key: string, emp: Employee): boolean {
  if (!emp.terminationDate) return false;
  const dem = emp.terminationDate.slice(0,10);
  return key > dem;
}

export function buildGrid(month: string, emp: Employee, tracks: TimeTrack[], startDay: number = 1, holidays: any[] = [], teamSchedules: any[] = []) {
  const safeHolidays = holidays || [];
  const [y,m] = month.split('-').map(Number); if (!y||!m) return [];
  const today = getLocalToday();
  const map = new Map<string, TimeTrack>();
  for (const t of tracks) map.set(toDateKey(t.date), t);
  const g: any[] = [];
  const empSchedule = teamSchedules.find(ts => ts.employee?.id === emp.id || ts.employeeId === emp.id);
  const calDays = empSchedule ? (empSchedule.days || []) : [];
  const getCalDay = (k: string) => calDays.find((cd: any) => cd.date === k);
  
  let startDate = new Date(Date.UTC(y, m - 1, 1));
  let endDate = new Date(Date.UTC(y, m, 0));

  if (startDay > 1) {
    startDate = new Date(Date.UTC(y, m - 2, startDay));
    const nextMonth = new Date(Date.UTC(y, m - 1, startDay));
    endDate = new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000);
  }

  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = new Date(d);
    const key = date.toISOString().slice(0,10);
    const holiday = safeHolidays.find(h => h.date && h.date.startsWith(key));
    const cd = getCalDay(key);
    let isRest = isRestDay(date,emp);
    let holidayName = holiday?.name;
    let scheduled = null;
    let dayType = 'WORK';
    if (cd) {
      isRest = cd.dayType === 'FOLGA' || cd.dayType === 'FOLGA_DSR' || cd.dayType === 'FOLGA_BANCO';
      if (cd.dayType === 'SEM_ESCALA') isRest = isRestDay(date, emp);
      if (cd.dayType === 'FERIADO' || cd.dayType === 'FERIADO_LOCAL') holidayName = holidayName || 'Feriado';
      scheduled = isRest ? null : cd.scheduled;
      dayType = cd.dayType;
    }

    if (!isRest && !scheduled) {
      scheduled = {
        entry: emp.standardEntry || '08:00',
        lunchStart: emp.standardLunchStart || '12:00',
        lunchReturn: emp.standardLunchReturn || '13:00',
        exit: emp.standardExit || '18:00'
      };
    }

    g.push({
      date, key, day: date.getUTCDate(), wd: date.getUTCDay(),
      isRest, isFuture: key>today, antesAdmissao: isAntesAdmissao(key,emp), depoisDemissao: isDepoisDemissao(key,emp),
      track: map.get(key), holidayName, scheduled, dayType
    });
  }
  return g;
}

export function dayStatus(row: TimeTrack, holidayName?: string) {
  if (row.manualStatus==='revoked') return 'REVOGADO';
  const o = (row.observation ?? '').toLowerCase();
  if (o.includes('atestado integral')) return 'ATESTADO';
  if (o.includes('atestado') && o.includes('horas')) return 'ATESTADO (HORAS)';
  if (o.includes('suspensao') || o.includes('suspensão')) return 'SUSPENSÃO';
  if (o.includes('feriado') || holidayName) return 'FERIADO';
  if (o.includes('folga extra')) return 'FOLGA EXTRA';
  if (o.includes('folga banco')) return 'FOLGA BANCO';
  if (o.includes('folga')) return 'FOLGA';
  const r = (row.manualReason ?? '').toLowerCase();
  if (r.includes('atestado integral')) return 'ATESTADO';
  if (r.includes('feriado')) return 'FERIADO';
  if (r.includes('folga dsr')) return 'FOLGA';
  if (r === 'ajuste_erro_marcacao') return 'PONTO INCOMPLETO';
  if (r === 'ajuste_abono_atraso') return 'ABONO DE ATRASO';
  if (r === 'ajuste_abono_banco_saida_antecipada') return 'ABONO SAÍDA';
  if (r === 'ajuste_abono_atestado_horas') return 'ATESTADO (HORAS)';
  if (r === 'ajuste_suspensao') return 'SUSPENSÃO';
  const occurrences: string[] = [];
  if ((row.lateMinutes ?? 0) > 0) occurrences.push(`ATRASO ${formatMinutes(row.lateMinutes ?? 0)}`);
  if ((row.earlyLeaveMinutes ?? 0) > 0) occurrences.push(`SAÍDA ANTECIPADA ${formatMinutes(row.earlyLeaveMinutes ?? 0)}`);
  if ((row.overtime50Minutes ?? 0) > 0) occurrences.push(`HE 50% ${formatMinutes(row.overtime50Minutes ?? 0)}`);
  if ((row.overtime100Minutes ?? 0) > 0) occurrences.push(`HE 100% ${formatMinutes(row.overtime100Minutes ?? 0)}`);
  if (occurrences.length) return occurrences.join(' + ');
  if (row.manualStatus==='pending') return 'PENDENTE';
  if (row.manualStatus==='rejected') return 'REJEITADO';
  if (row.manualReason || o.includes('ajuste')) return 'AJUSTE MANUAL';
  if (!row.entry && !row.exit) return 'FALTA';
  return 'NORMAL';
}

export function isFalta(row: TimeTrack) {
  if (row.entry || row.exit) return false;
  const o = (row.observation ?? '').toLowerCase();
  const r = (row.manualReason ?? '').toLowerCase();
  if (o.includes('atestado') || r.includes('atestado')) return false;
  if (o.includes('feriado') || r.includes('feriado')) return false;
  if (o.includes('folga') || r.includes('folga')) return false;
  if (o.includes('abonado') || r.includes('abonado')) return false;
  if (o.includes('suspensao') || o.includes('suspensão') || r.includes('suspensao') || r.includes('suspensão')) return false;
  return true;
}

export function getEffectiveStatsFromGrid(grid: any[]) {
  let worked = 0;
  let saldo = 0;
  grid.forEach(g => {
    if (g.isFuture || g.antesAdmissao || g.depoisDemissao) return;
    if (g.track) {
      worked += (g.track.totalWorked ?? 0);
      saldo += (g.track.dailyBalance ?? 0);
    } else if (!g.isRest) {
      let expected = 480;
      if (g.scheduled && g.scheduled.entry && g.scheduled.exit) {
        const ent = new Date(`1970-01-01T${g.scheduled.entry}Z`);
        const ext = new Date(`1970-01-01T${g.scheduled.exit}Z`);
        expected = (ext.getTime() - ent.getTime()) / 60000;
        if (g.scheduled.lunchStart && g.scheduled.lunchReturn) {
          const lEnt = new Date(`1970-01-01T${g.scheduled.lunchStart}Z`);
          const lExt = new Date(`1970-01-01T${g.scheduled.lunchReturn}Z`);
          expected -= (lExt.getTime() - lEnt.getTime()) / 60000;
        }
      }
      saldo -= expected;
    }
  });
  return { worked, saldo };
}
