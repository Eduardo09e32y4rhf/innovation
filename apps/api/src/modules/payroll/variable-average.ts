import { addMonths, parseDay } from './labor-dates';

export interface ClosingForAverage {
  periodEnd: Date | string;
  overtime50Value: number;
  overtime100Value: number;
  nightShiftValue: number;
  dsrValue: number;
  hourlyRate: number;
  monthlyDivisor: number;
}

export interface VariableAverageResult {
  monthly: number;
  monthsConsidered: number;
  closingsFound: number;
  source: 'AUTO' | 'MANUAL' | 'NONE';
  warnings: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Janela: os 12 meses civis imediatamente anteriores ao mês do desligamento (o mês corrente ainda não está fechado). */
export function averageWindow(admission: Date | string, termination: Date | string) {
  const term = parseDay(termination);
  const adm = parseDay(admission);
  const termMonthStart = new Date(Date.UTC(term.getUTCFullYear(), term.getUTCMonth(), 1));
  const windowStart = addMonths(termMonthStart, -12);
  const admMonthStart = new Date(Date.UTC(adm.getUTCFullYear(), adm.getUTCMonth(), 1));
  const from = admMonthStart.getTime() > windowStart.getTime() ? admMonthStart : windowStart;
  const months = Math.max(
    0,
    (termMonthStart.getUTCFullYear() - from.getUTCFullYear()) * 12 + (termMonthStart.getUTCMonth() - from.getUTCMonth()),
  );
  return { from, to: termMonthStart, months };
}

/**
 * Média mensal das verbas variáveis (horas extras 50%/100%, adicional noturno e o DSR sobre elas) dos últimos 12 meses.
 * CLT art. 142 §§3º e 5º (férias), art. 487 §3º (aviso) e Súmula 45 TST (13º). Súmula 347 TST: a média é de HORAS
 * efetivamente prestadas, valoradas pelo salário-hora da época do pagamento — por isso cada fechamento é reprecificado
 * pela razão (salário-hora atual ÷ salário-hora do fechamento). Meses sem fechamento contam como zero na média.
 */
export function computeVariableAverage(
  closings: ClosingForAverage[],
  ctx: { salary: number; admission: Date | string; termination: Date | string },
): VariableAverageResult {
  const win = averageWindow(ctx.admission, ctx.termination);
  const warnings: string[] = [];
  if (win.months === 0) return { monthly: 0, monthsConsidered: 0, closingsFound: 0, source: 'NONE', warnings };

  const byMonth = new Map<string, ClosingForAverage>();
  for (const c of closings) {
    const end = parseDay(c.periodEnd);
    if (end.getTime() < win.from.getTime() || end.getTime() >= win.to.getTime()) continue;
    byMonth.set(`${end.getUTCFullYear()}-${end.getUTCMonth()}`, c);
  }

  const latest = [...byMonth.values()].sort((a, b) => parseDay(b.periodEnd).getTime() - parseDay(a.periodEnd).getTime())[0];
  const currentHourly = latest && latest.monthlyDivisor > 0 ? ctx.salary / latest.monthlyDivisor : 0;

  let total = 0;
  for (const c of byMonth.values()) {
    const value = c.overtime50Value + c.overtime100Value + c.nightShiftValue + c.dsrValue;
    const ratio = c.hourlyRate > 0 && currentHourly > 0 ? currentHourly / c.hourlyRate : 1;
    total += value * ratio;
  }

  if (byMonth.size < win.months) {
    warnings.push(
      `Média de variáveis calculada com ${byMonth.size} fechamento(s) para ${win.months} mês(es) do período; meses sem fechamento contam como zero. Confira os fechamentos de ponto.`,
    );
  }
  return {
    monthly: round2(total / win.months),
    monthsConsidered: win.months,
    closingsFound: byMonth.size,
    source: 'AUTO',
    warnings,
  };
}
