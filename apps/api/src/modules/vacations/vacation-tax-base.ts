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
