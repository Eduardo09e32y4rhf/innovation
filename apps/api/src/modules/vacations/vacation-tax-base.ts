const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Férias gozadas + 1/3: base de INSS/IRRF do recibo de férias. Abono pecuniário e seu 1/3 ficam de fora (isentos).
 * Fonte única para o recibo (vacation-receipt) e para o INSS unificado do fechamento mensal.
 */
export function vacationTaxableGross(salary: number, daysUsed: number): number {
  if (!Number.isFinite(salary) || salary <= 0 || !Number.isFinite(daysUsed) || daysUsed <= 0) return 0;
  const vacationPay = round((salary / 30) * daysUsed);
  return round(vacationPay + round(vacationPay / 3));
}

/** Dias de gozo (daysUsed a partir de startDate), um Date UTC por dia. O abono vendido (soldDays) é trabalhado e não entra. */
export function vacationEnjoymentDates(vacation: { startDate: Date; daysUsed: number }): Date[] {
  const total = Number.isFinite(vacation.daysUsed) ? Math.max(0, Math.floor(vacation.daysUsed)) : 0;
  const dates: Date[] = [];
  for (let i = 0; i < total; i += 1) {
    const day = new Date(vacation.startDate);
    day.setUTCDate(day.getUTCDate() + i);
    dates.push(day);
  }
  return dates;
}
