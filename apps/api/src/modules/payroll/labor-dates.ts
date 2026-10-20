const DAY = 86_400_000;

export function parseDay(value: string | Date): Date {
  const d = typeof value === 'string' ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  if (Number.isNaN(d.getTime())) throw new Error(`Data inválida: ${String(value)}`);
  return d;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Mesmo dia N meses depois; se o mês não tiver o dia, usa o último dia do mês. */
export function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const target = new Date(Date.UTC(y, m, 1));
  const day = Math.min(date.getUTCDate(), daysInMonth(target.getUTCFullYear(), target.getUTCMonth()));
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), day));
}

export function inclusiveDays(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / DAY) + 1;
}

export function fullYearsBetween(start: Date, end: Date): number {
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  if (addMonths(start, years * 12).getTime() > end.getTime()) years -= 1;
  return Math.max(0, years);
}

/** Avos de férias (CLT art. 146 parágrafo único): mês completo do período aquisitivo ou fração >= 15 dias. */
export function vacationTwelfths(periodStart: Date, end: Date): number {
  if (end.getTime() < periodStart.getTime()) return 0;
  let avos = 0;
  let cursor = periodStart;
  while (avos < 12) {
    const next = addMonths(periodStart, avos + 1);
    if (addDays(next, -1).getTime() <= end.getTime()) {
      avos += 1;
      cursor = next;
      continue;
    }
    if (inclusiveDays(cursor, end) >= 15) avos += 1;
    break;
  }
  return Math.min(12, avos);
}

/** Avos de 13º (Lei 4.090/1962 art. 1º §2º): mês civil com 15 dias ou mais de trabalho no ano. */
export function thirteenthTwelfths(year: number, start: Date, end: Date): number {
  let avos = 0;
  for (let month = 0; month < 12; month++) {
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month, daysInMonth(year, month)));
    const from = start.getTime() > monthStart.getTime() ? start : monthStart;
    const to = end.getTime() < monthEnd.getTime() ? end : monthEnd;
    if (to.getTime() >= from.getTime() && inclusiveDays(from, to) >= 15) avos += 1;
  }
  return avos;
}

/** Dias de saldo de salário no mês do desligamento, em mês comercial de 30 dias. */
export function salaryBalanceDays(admission: Date, termination: Date): number {
  const monthStart = new Date(Date.UTC(termination.getUTCFullYear(), termination.getUTCMonth(), 1));
  const from = admission.getTime() > monthStart.getTime() ? admission : monthStart;
  const lastDay = daysInMonth(termination.getUTCFullYear(), termination.getUTCMonth());
  if (from.getUTCDate() === 1 && termination.getUTCDate() === lastDay) return 30;
  return Math.min(30, inclusiveDays(from, termination));
}

/** Início do período aquisitivo em curso (último aniversário da admissão <= data). */
export function currentVacationPeriodStart(admission: Date, at: Date): Date {
  return addMonths(admission, fullYearsBetween(admission, at) * 12);
}
