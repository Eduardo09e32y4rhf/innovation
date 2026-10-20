import { PayrollCalculationService, PayrollTaxContext } from '../time-track/payroll-calculation.service';
import { parseDay, thirteenthTwelfths } from './labor-dates';

export const toCents = (reais: number) => Math.round(reais * 100);
export const toReais = (cents: number) => cents / 100;

const engine = new PayrollCalculationService();

/**
 * 13º tem tributação própria: INSS em separado (Lei 8.212/91 art. 28 §7º) e IRRF exclusivo na fonte,
 * sem desconto simplificado mensal, com o redutor da Lei 15.270/2025 (aplicável ao 13º, orientação RFB dez/2025).
 */
export function thirteenthTaxes(grossCents: number, dependents: number, ctx?: PayrollTaxContext) {
  const gross = toReais(grossCents);
  const inss = engine.calculateInss(gross, ctx?.inss.brackets);
  const params = ctx?.irrf.parameters ?? PayrollCalculationService.DEFAULT_IRRF_PARAMETERS;
  const base = Math.max(0, gross - inss - Math.max(0, dependents) * params.dependentDeduction);
  const irrf = engine.calculateIrrf(Math.round(base * 100) / 100, gross, ctx?.irrf.brackets, params);
  return { inssCents: toCents(inss), irrfBaseCents: toCents(base), irrfCents: toCents(irrf) };
}

export interface ThirteenthInput {
  year: number;
  salary: number;
  admissionDate: string | Date;
  terminationDate?: string | Date | null;
  dependents?: number;
  firstInstallmentPaid?: number;
  taxContext?: PayrollTaxContext;
}

/**
 * Lei 4.090/1962 (1/12 por mês com >= 15 dias) e Lei 4.749/1965 (1ª parcela até 30/11 = metade, sem descontos;
 * 2ª parcela até 20/12 com INSS e IRRF sobre o total).
 */
export function calculateThirteenth(input: ThirteenthInput) {
  const yearStart = new Date(Date.UTC(input.year, 0, 1));
  const yearEnd = new Date(Date.UTC(input.year, 11, 31));
  const admission = parseDay(input.admissionDate);
  const termination = input.terminationDate ? parseDay(input.terminationDate) : null;
  const start = admission.getTime() > yearStart.getTime() ? admission : yearStart;
  const end = termination && termination.getTime() < yearEnd.getTime() ? termination : yearEnd;
  const avos = start.getTime() > end.getTime() ? 0 : thirteenthTwelfths(input.year, start, end);

  const totalCents = Math.round((toCents(input.salary) * avos) / 12);
  const firstCents = input.firstInstallmentPaid != null ? toCents(input.firstInstallmentPaid) : Math.round(totalCents / 2);
  const taxes = thirteenthTaxes(totalCents, input.dependents ?? 0, input.taxContext);
  const secondCents = Math.max(0, totalCents - firstCents - taxes.inssCents - taxes.irrfCents);

  return {
    year: input.year,
    avos,
    total: toReais(totalCents),
    firstInstallment: { amount: toReais(firstCents), dueDate: `${input.year}-11-30` },
    secondInstallment: {
      gross: toReais(totalCents - firstCents),
      inss: toReais(taxes.inssCents),
      irrfBase: toReais(taxes.irrfBaseCents),
      irrf: toReais(taxes.irrfCents),
      net: toReais(secondCents),
      dueDate: `${input.year}-12-20`,
    },
    netTotal: toReais(firstCents + secondCents),
  };
}
