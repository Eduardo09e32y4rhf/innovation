import { prorationDays, toCents } from './pricing';

export interface ProrationInput {
  /** Total do ciclo atual (o que a empresa paga hoje por ciclo). */
  currentTotal: number;
  /** Total do ciclo depois da mudança. */
  nextTotal: number;
  periodStart?: Date | null;
  periodEnd: Date;
  now?: Date;
}

export interface ProrationResult {
  amount: number;
  remainingDays: number;
  cycleDays: number;
}

/**
 * Rateio por dia: no upgrade cobra a diferença proporcional aos dias que faltam no ciclo.
 * Downgrade (ou valor igual) não gera cobrança nem crédito: a mudança vale no próximo ciclo.
 * Dias contados por data de calendário em America/Sao_Paulo (mesma regra de pricing.ts); valores em reais.
 */
export function prorateUpgrade(input: ProrationInput): ProrationResult {
  const now = input.now ?? new Date();
  const { remainingDays, cycleDays } = prorationDays({ periodStart: input.periodStart, periodEnd: input.periodEnd, changeAt: now, fallbackCycleDays: 30 });
  const diffCents = toCents(input.nextTotal) - toCents(input.currentTotal);
  if (diffCents <= 0 || remainingDays === 0) return { amount: 0, remainingDays, cycleDays };
  return { amount: Math.round((diffCents * remainingDays) / cycleDays) / 100, remainingDays, cycleDays };
}
