const DAY_MS = 86_400_000;

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

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Rateio por dia: no upgrade cobra a diferença proporcional aos dias que faltam no ciclo.
 * Downgrade (ou valor igual) não gera cobrança nem crédito: a mudança vale no próximo ciclo.
 */
export function prorateUpgrade(input: ProrationInput): ProrationResult {
  const now = input.now ?? new Date();
  const start = input.periodStart ?? new Date(input.periodEnd.getTime() - 30 * DAY_MS);
  const cycleDays = Math.max(1, Math.round((input.periodEnd.getTime() - start.getTime()) / DAY_MS));
  const remainingDays = Math.min(cycleDays, Math.max(0, Math.ceil((input.periodEnd.getTime() - now.getTime()) / DAY_MS)));
  const diff = input.nextTotal - input.currentTotal;
  if (diff <= 0 || remainingDays === 0) return { amount: 0, remainingDays, cycleDays };
  return { amount: round2((diff * remainingDays) / cycleDays), remainingDays, cycleDays };
}
