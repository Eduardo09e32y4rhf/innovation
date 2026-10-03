import type { DayStatus, DayType } from './types';

export function fmtMinutes(minutes: number | null | undefined, signed = false) {
  if (minutes === null || minutes === undefined) return '—';
  const abs = Math.abs(Math.round(minutes));
  const text = `${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, '0')}`;
  if (minutes < 0) return `-${text}`;
  return signed && minutes > 0 ? `+${text}` : text;
}

export function fmtTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(date);
}

export function fmtDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function fmtDateLong(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(`${value}T00:00:00Z`));
}

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function currentMonthKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
}

export function shiftMonth(month: string, delta: number) {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${month}-01T00:00:00Z`));
}

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  TRABALHO: 'Trabalho', FOLGA: 'Folga', FERIADO: 'Feriado', FERIAS: 'Férias', ATESTADO: 'Atestado', SUSPENSAO: 'Suspensão',
  COMPENSACAO: 'Trabalho (troca)', FERIADO_LOCAL: 'Feriado local', AJUSTE_ESCALA: 'Ajuste de escala', SEM_ESCALA: 'Sem escala',
};

/** Classes de cor (tokens do design system + utilitários) por tipo de dia. */
export const DAY_TYPE_STYLE: Record<DayType, string> = {
  TRABALHO: 'bg-purple-50 text-purple-800 border-purple-200',
  COMPENSACAO: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  FOLGA: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  FERIADO: 'bg-amber-50 text-amber-800 border-amber-200',
  FERIADO_LOCAL: 'bg-amber-50 text-amber-800 border-amber-200',
  FERIAS: 'bg-sky-50 text-sky-800 border-sky-200',
  ATESTADO: 'bg-rose-50 text-rose-700 border-rose-200',
  SUSPENSAO: 'bg-rose-50 text-rose-700 border-rose-200',
  AJUSTE_ESCALA: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  SEM_ESCALA: 'bg-white text-zinc-400 border-dashed border-zinc-300',
};

export const STATUS_LABEL: Record<Exclude<DayStatus, null>, string> = {
  OK: 'Em dia', FALTA: 'Falta', ATRASO: 'Atraso', PENDENTE: 'Pendente', ANDAMENTO: 'Em andamento',
};

export const STATUS_DOT: Record<Exclude<DayStatus, null>, string> = {
  OK: 'bg-emerald-500', FALTA: 'bg-rose-500', ATRASO: 'bg-amber-500', PENDENTE: 'bg-orange-500', ANDAMENTO: 'bg-sky-500',
};

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  AWAITING_PEER: 'Aguardando colega', PENDING: 'Aguardando aprovação', APPROVED: 'Aprovada', REJECTED: 'Reprovada', CANCELLED: 'Cancelada',
};

export const REQUEST_STATUS_TONE: Record<string, string> = {
  AWAITING_PEER: 'bg-sky-50 text-sky-700', PENDING: 'bg-amber-50 text-amber-700', APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-rose-50 text-rose-700', CANCELLED: 'bg-zinc-100 text-zinc-600',
};

export function describeRequest(type: string, payload: Record<string, any>) {
  switch (type) {
    case 'TROCA_FOLGA': return `Folgar em ${fmtDate(payload.offDate)} e trabalhar em ${fmtDate(payload.workDate)}`;
    case 'TROCA_TURNO': return `Trocar o turno de ${fmtDate(payload.date)}`;
    case 'NOVA_ESCALA': return `Mudar de escala a partir de ${fmtDate(payload.startDate)}`;
    case 'AJUSTE_BATIDA': return `Ajustar batidas de ${fmtDate(payload.date)}`;
    case 'JUSTIFICATIVA': return `Justificar ${String(payload.kind ?? '').toLowerCase()} em ${fmtDate(payload.date)}`;
    case 'FOLGA_COMPENSACAO': return `Folga por compensação em ${fmtDate(payload.date)}`;
    default: return type;
  }
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
