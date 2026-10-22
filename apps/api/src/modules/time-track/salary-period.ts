const DAY_MS = 86_400_000;

/** Proporção do salário mensal por dias corridos de cada mês do ciclo (inclusive DSR). */
export function monthlySalaryFraction(start: Date, end: Date): number {
  const inclusiveDays = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  // Um ciclo mensal convencional pode atravessar a virada do calendário (ex.: 25 a 24).
  if (start.getUTCMonth() !== end.getUTCMonth() && inclusiveDays >= 28 && inclusiveDays <= 31) return 1;
  let fraction = 0;
  for (let cursor = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1); cursor <= end.getTime(); cursor = Date.UTC(new Date(cursor).getUTCFullYear(), new Date(cursor).getUTCMonth() + 1, 1)) {
    const monthStart = new Date(cursor);
    const nextMonth = Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1);
    const daysInMonth = (nextMonth - cursor) / DAY_MS;
    const first = Math.max(start.getTime(), cursor);
    const last = Math.min(end.getTime(), nextMonth - DAY_MS);
    if (last >= first) fraction += (Math.round((last - first) / DAY_MS) + 1) / daysInMonth;
  }
  return fraction;
}
