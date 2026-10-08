// Regras do ASO / PCMSO (NR-7). Funções puras: sem banco, fáceis de testar.

export const ASO_KINDS = ['ADMISSIONAL', 'PERIODICO', 'RETORNO_AO_TRABALHO', 'MUDANCA_DE_FUNCAO', 'DEMISSIONAL', 'COMPLEMENTAR'] as const;
export type AsoKind = (typeof ASO_KINDS)[number];

/** Exames que "renovam" a aptidão do trabalhador. Demissional e complementar não geram novo vencimento. */
const RENEWING: ReadonlySet<string> = new Set(['ADMISSIONAL', 'PERIODICO', 'RETORNO_AO_TRABALHO', 'MUDANCA_DE_FUNCAO']);

/** Tipos que renovam a aptidao (lista usada tambem para filtrar o cron do periodico). */
export const RENEWING_KINDS = ['ADMISSIONAL', 'PERIODICO', 'RETORNO_AO_TRABALHO', 'MUDANCA_DE_FUNCAO'] as const;

export const DEFAULT_PERIODICITY_MONTHS = 12;
export const ALLOWED_PERIODICITY_MONTHS = [6, 12, 24] as const;
export const EXPIRING_WINDOW_DAYS = 30;

export function isRenewing(kind: string): boolean {
  return RENEWING.has(kind);
}

export function normalizePeriodicity(months?: number | null): number {
  return (ALLOWED_PERIODICITY_MONTHS as readonly number[]).includes(Number(months)) ? Number(months) : DEFAULT_PERIODICITY_MONTHS;
}

function addMonthsUtc(date: Date, months: number): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  // 31/jan + 1 mês = último dia de fev, não 3/mar.
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** Vencimento do ASO concluído: data do exame + periodicidade. Sem vencimento para demissional/complementar. */
export function computeDueDate(kind: string, examDate: Date, periodicityMonths?: number | null): Date | null {
  if (!isRenewing(kind)) return null;
  return addMonthsUtc(examDate, normalizePeriodicity(periodicityMonths));
}

export type AsoState = 'OPEN' | 'VALID' | 'EXPIRING' | 'EXPIRED' | 'INAPTO' | 'CANCELED';

export interface AsoLike {
  asoType: string;
  status: string;
  result?: string | null;
  examDate?: Date | null;
  dueDate?: Date | null;
}

const startOfDayUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export function daysUntil(due: Date, today: Date): number {
  return Math.round((startOfDayUtc(due).getTime() - startOfDayUtc(today).getTime()) / 86_400_000);
}

/** Estado de um registro individual. */
export function asoState(record: AsoLike, today = new Date(), windowDays = EXPIRING_WINDOW_DAYS): AsoState {
  if (record.status === 'CANCELLED') return 'CANCELED';
  if (record.status !== 'COMPLETED') return 'OPEN';
  if (record.result === 'INAPTO') return 'INAPTO';
  if (!record.dueDate) return 'VALID';
  const left = daysUntil(record.dueDate, today);
  if (left < 0) return 'EXPIRED';
  if (left <= windowDays) return 'EXPIRING';
  return 'VALID';
}

export type ComplianceState = 'NO_ASO' | 'VALID' | 'EXPIRING' | 'EXPIRED' | 'INAPTO';

export interface Compliance {
  state: ComplianceState;
  dueDate: Date | null;
  daysLeft: number | null;
  basedOnId: string | null;
}

/**
 * Situação de um colaborador ativo: vale o ASO que renova (admissional, periódico, retorno, mudança de função)
 * mais recente já concluído. Quem nunca fez nenhum está "sem ASO" (irregular desde a admissão).
 */
export function employeeCompliance(records: Array<AsoLike & { id: string }>, today = new Date(), windowDays = EXPIRING_WINDOW_DAYS): Compliance {
  const done = records
    .filter((r) => r.status === 'COMPLETED' && isRenewing(r.asoType))
    .sort((a, b) => (b.examDate?.getTime() ?? 0) - (a.examDate?.getTime() ?? 0));
  const latest = done[0];
  if (!latest) return { state: 'NO_ASO', dueDate: null, daysLeft: null, basedOnId: null };
  const state = asoState(latest, today, windowDays);
  const daysLeft = latest.dueDate ? daysUntil(latest.dueDate, today) : null;
  const mapped: ComplianceState = state === 'INAPTO' ? 'INAPTO' : state === 'EXPIRED' ? 'EXPIRED' : state === 'EXPIRING' ? 'EXPIRING' : 'VALID';
  return { state: mapped, dueDate: latest.dueDate ?? null, daysLeft, basedOnId: latest.id };
}
