import { toDateOnly } from '../../common/utils/date.utils';

const DAY_MS = 86_400_000;

/** Vencimento = dia seguinte no calendario de Brasilia (America/Sao_Paulo), como data-only (meia-noite UTC). */
export function saoPauloTomorrow(now: Date = new Date()): Date {
  return new Date(toDateOnly(now).getTime() + DAY_MS);
}

/** Dias de calendario (Brasilia) entre o vencimento e hoje. Positivo = atraso; negativo = dias ate vencer. */
export function saoPauloDaysOverdue(dueDate: Date, now: Date = new Date()): number {
  // dueDate e gravado como data-only em UTC (YYYY-MM-DDT00:00Z): seu dia de calendario e o dia UTC.
  const due = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  return Math.round((toDateOnly(now).getTime() - due) / DAY_MS);
}
