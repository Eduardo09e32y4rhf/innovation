/**
 * Conferência legal do espelho de ponto antes de fechar a folha (CLT, Portaria MTP 671/2021, Lei 13.467/2017).
 * Funções puras: recebem os registros do período e devolvem pendências e valores a pagar. Convenção coletiva pode
 * alterar vários limites; os valores abaixo são o mínimo legal.
 */

export type IssueSeverity = 'BLOCK' | 'WARN';

export interface ComplianceIssue {
  code: 'PUNCH_INCOMPLETE' | 'ADJUST_PENDING' | 'ABSENCE_UNJUSTIFIED' | 'OVERTIME_OVER_LIMIT' | 'OVERTIME_NOT_APPROVED' | 'BREAK_SHORT' | 'BREAK_MISSING' | 'REST_BETWEEN_SHIFTS' | 'BRITISH_PUNCH' | 'WEEKLY_REST_LOST';
  severity: IssueSeverity;
  date?: string;
  message: string;
}

export interface TrackLike {
  date: Date;
  entry?: Date | null;
  lunchStart?: Date | null;
  lunchReturn?: Date | null;
  exit?: Date | null;
  totalWorked?: number | null;
  overtime50Minutes?: number | null;
  overtime100Minutes?: number | null;
  overtimeApprovalStatus?: string | null;
  manualStatus?: string | null;
  incidentType?: string | null;
}

/** Limites legais (art. 66, 71 e 59 da CLT; Súmula 338 do TST). */
export const LEGAL = {
  minRestBetweenShiftsMinutes: 11 * 60,
  longShiftMinutes: 6 * 60,
  fullBreakMinutes: 60,
  shortShiftMinutes: 4 * 60,
  shortBreakMinutes: 15,
  maxDailyOvertimeMinutes: 120,
  britishPunchMinDays: 10,
} as const;

const TZ_OFFSET_MS = 3 * 3_600_000; // America/Sao_Paulo (UTC-3, sem horário de verão)
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const localMinute = (value: Date) => Math.floor((((value.getTime() - TZ_OFFSET_MS) % 86_400_000) + 86_400_000) % 86_400_000 / 60_000);
const minutesBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60_000);
const br = (key: string) => key.split('-').reverse().join('/');

/** Punches ordenados do dia. */
function punches(track: TrackLike) {
  return [track.entry, track.lunchStart, track.lunchReturn, track.exit].filter((v): v is Date => v instanceof Date && !Number.isNaN(v.getTime())).sort((a, b) => a.getTime() - b.getTime());
}

/** Tempo de intervalo que a lei exige para a jornada (art. 71): >6h = 1h; de 4h a 6h = 15 min. */
export function requiredBreakMinutes(spanMinutes: number): number {
  if (spanMinutes > LEGAL.longShiftMinutes) return LEGAL.fullBreakMinutes;
  if (spanMinutes > LEGAL.shortShiftMinutes) return LEGAL.shortBreakMinutes;
  return 0;
}

/**
 * Minutos de intervalo suprimido ou incompleto no dia. Só calcula quando o intervalo foi realmente marcado
 * (saída e volta); sem marcação o sistema não sabe quanto foi gozado e a pendência vira aviso (BREAK_MISSING).
 * O tempo faltante é pago com 50%, de natureza indenizatória (art. 71 §4º).
 */
export function breakDeficitMinutes(track: TrackLike): number {
  if (!track.entry || !track.exit || !track.lunchStart || !track.lunchReturn) return 0;
  const required = requiredBreakMinutes(minutesBetween(track.entry, track.exit));
  const taken = Math.max(0, minutesBetween(track.lunchStart, track.lunchReturn));
  return Math.max(0, required - taken);
}

export interface WeekLoss { weekStart: string; absenceDates: string[] }

/** Semanas (seg-dom) com falta injustificada: perdem o DSR (Lei 605/49, art. 6º). Só conta semanas completas dentro do período. */
export function weeksLosingRest(absenceDates: string[], periodStart: Date, periodEnd: Date): WeekLoss[] {
  const weeks = new Map<string, string[]>();
  for (const key of absenceDates) {
    const date = new Date(`${key}T00:00:00Z`);
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    if (sunday > periodEnd || monday < periodStart) continue; // semana cortada pelo período: o DSR é tratado no fechamento vizinho
    const week = dayKey(monday);
    weeks.set(week, [...(weeks.get(week) ?? []), key]);
  }
  return [...weeks.entries()].map(([weekStart, dates]) => ({ weekStart, absenceDates: dates.sort() })).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export interface AnalyzeInput {
  tracks: TrackLike[];
  /** Dias úteis passados sem nenhum registro e sem justificativa (atestado, férias, folga). */
  unjustifiedAbsenceDates: string[];
  periodStart: Date;
  periodEnd: Date;
  /** Cargo de gestão ou trabalho externo (art. 62) e empresas com até 20 empregados (art. 74 §2º) não têm controle obrigatório. */
  exemptFromTimeControl?: boolean;
}

export interface ComplianceResult {
  issues: ComplianceIssue[];
  breakDeficitMinutes: number;
  restLossWeeks: WeekLoss[];
}

export function analyzeTimesheet(input: AnalyzeInput): ComplianceResult {
  const issues: ComplianceIssue[] = [];
  const tracks = [...input.tracks].sort((a, b) => a.date.getTime() - b.date.getTime());
  let breakDeficit = 0;
  const todayKey = dayKey(new Date());

  for (const track of tracks) {
    const key = dayKey(track.date);
    const list = punches(track);
    const worked = (track.totalWorked ?? 0) > 0 || list.length > 0;
    const unpaired = Boolean(track.entry) !== Boolean(track.exit) || Boolean(track.lunchStart) !== Boolean(track.lunchReturn) || (list.length > 0 && !track.entry && !track.exit);
    if (key <= todayKey && unpaired) {
      issues.push({ code: 'PUNCH_INCOMPLETE', severity: 'BLOCK', date: key, message: `${br(key)}: marcações ímpares ou faltando (${list.length} registrada(s)). Ajuste com justificativa e ciência do gestor, sem apagar a marcação original.` });
    }
    if (track.manualStatus === 'pending') {
      issues.push({ code: 'ADJUST_PENDING', severity: 'BLOCK', date: key, message: `${br(key)}: ajuste manual aguardando ciência do gestor.` });
    }
    const overtime = (track.overtime50Minutes ?? 0) + (track.overtime100Minutes ?? 0);
    if (overtime > LEGAL.maxDailyOvertimeMinutes) {
      issues.push({ code: 'OVERTIME_OVER_LIMIT', severity: 'WARN', date: key, message: `${br(key)}: ${Math.round(overtime / 6) / 10}h de hora extra, acima do limite de 2h por dia (art. 59).` });
    }
    if (overtime > 0 && track.overtimeApprovalStatus === 'PENDING') {
      issues.push({ code: 'OVERTIME_NOT_APPROVED', severity: 'WARN', date: key, message: `${br(key)}: hora extra sem aprovação do gestor.` });
    }
    if (worked && track.entry && track.exit) {
      const span = minutesBetween(track.entry, track.exit);
      const required = requiredBreakMinutes(span);
      if (required > 0 && !(track.lunchStart && track.lunchReturn)) {
        issues.push({ code: 'BREAK_MISSING', severity: 'WARN', date: key, message: `${br(key)}: intervalo de ${required} min não foi marcado. Pré-assinalar o intervalo gera passivo trabalhista.` });
      } else {
        const deficit = breakDeficitMinutes(track);
        if (deficit > 0) {
          breakDeficit += deficit;
          issues.push({ code: 'BREAK_SHORT', severity: 'WARN', date: key, message: `${br(key)}: intervalo ${deficit} min menor que o mínimo legal. O tempo faltante é pago com 50% (art. 71 §4º).` });
        }
      }
    }
  }

  // Interjornada (art. 66): mínimo de 11h entre o fim de um dia e o início do seguinte.
  for (let i = 1; i < tracks.length; i++) {
    const prev = tracks[i - 1]; const next = tracks[i];
    const prevList = punches(prev); const nextList = punches(next);
    if (prevList.length < 2 || nextList.length < 2) continue;
    const rest = minutesBetween(prevList[prevList.length - 1], nextList[0]);
    if (rest >= 0 && rest < LEGAL.minRestBetweenShiftsMinutes) {
      issues.push({ code: 'REST_BETWEEN_SHIFTS', severity: 'WARN', date: dayKey(next.date), message: `${br(dayKey(next.date))}: ${Math.floor(rest / 60)}h${String(rest % 60).padStart(2, '0')} de descanso desde a saída anterior, abaixo das 11h (art. 66).` });
    }
  }

  // Ponto "britânico" (Súmula 338 do TST): marcações sempre idênticas invertem o ônus da prova contra a empresa.
  if (!input.exemptFromTimeControl) {
    const complete = tracks.filter((t) => t.entry && t.exit);
    if (complete.length >= LEGAL.britishPunchMinDays) {
      const signature = (t: TrackLike) => `${localMinute(t.entry as Date)}-${localMinute(t.exit as Date)}`;
      const counts = new Map<string, number>();
      for (const t of complete) counts.set(signature(t), (counts.get(signature(t)) ?? 0) + 1);
      const top = Math.max(...counts.values());
      if (top === complete.length) issues.push({ code: 'BRITISH_PUNCH', severity: 'WARN', message: `Todas as ${complete.length} marcações têm o mesmo horário de entrada e saída. Ponto "britânico" inverte o ônus da prova (Súmula 338 do TST): confira se os horários são reais.` });
    }
  }

  const restLossWeeks = weeksLosingRest(input.unjustifiedAbsenceDates, input.periodStart, input.periodEnd);
  for (const key of input.unjustifiedAbsenceDates) {
    issues.push({ code: 'ABSENCE_UNJUSTIFIED', severity: 'WARN', date: key, message: `${br(key)}: falta sem justificativa. Desconta o dia e faz perder o DSR da semana.` });
  }
  for (const week of restLossWeeks) {
    issues.push({ code: 'WEEKLY_REST_LOST', severity: 'WARN', date: week.weekStart, message: `Semana de ${br(week.weekStart)}: perde o descanso semanal remunerado por falta injustificada (${week.absenceDates.map(br).join(', ')}).` });
  }

  return { issues, breakDeficitMinutes: breakDeficit, restLossWeeks };
}

/** Prazo legal para pagar o salário: até o 5º dia útil do mês seguinte (art. 459 §1º). Sábado conta como dia útil; domingo e feriado não. */
export function salaryDeadline(year: number, month: number, holidays: Set<string> = new Set()): Date {
  const date = new Date(Date.UTC(year, month - 1, 1));
  let count = 0;
  while (true) {
    const weekday = date.getUTCDay();
    if (weekday !== 0 && !holidays.has(dayKey(date))) { count++; if (count === 5) return date; }
    date.setUTCDate(date.getUTCDate() + 1);
  }
}

