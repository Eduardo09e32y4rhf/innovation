import { ITEM_TYPE_LABEL, isDeductionType } from './clt-discounts';

/** INSS patronal estimado (CPP de 20% sobre o bruto). RAT e terceiros dependem do enquadramento da empresa e não entram. */
export const EMPLOYER_INSS_RATE = 0.2;

const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export interface FiscalPayroll {
  grossSalary: unknown; netSalary: unknown; inssAmount: unknown; irrfAmount: unknown; fgtsAmount: unknown;
  items: Array<{ type: string; amount: unknown }>;
}

export interface FiscalSummary {
  employees: number;
  gross: number;
  /** Total a pagar de salário líquido. */
  netToPay: number;
  /** Total de descontos do funcionário (INSS, IRRF e os demais). */
  totalDiscounts: number;
  discountsByType: Array<{ type: string; label: string; amount: number }>;
  charges: { fgts: number; employerInss: number; employerInssRate: number; total: number };
  /** Bruto + encargos patronais. */
  companyCost: number;
}

/** Resumo fiscal do mês da empresa: salário líquido, descontos por tipo, encargos e custo total. */
export function buildFiscalSummary(payrolls: FiscalPayroll[]): FiscalSummary {
  const byType = new Map<string, number>();
  let gross = 0; let net = 0; let fgts = 0;
  for (const p of payrolls) {
    gross += num(p.grossSalary); net += num(p.netSalary); fgts += num(p.fgtsAmount);
    for (const item of p.items) {
      // Faltas/atrasos já reduzem o bruto (antes dos impostos); não entram como desconto do líquido.
      if (item.type === 'FGTS' || item.type === 'ABSENCE_DEDUCTION' || !isDeductionType(item.type)) continue;
      byType.set(item.type, (byType.get(item.type) ?? 0) + num(item.amount));
    }
  }
  const discountsByType = [...byType.entries()].map(([type, amount]) => ({ type, label: ITEM_TYPE_LABEL[type] ?? type, amount: r2(amount) })).sort((a, b) => b.amount - a.amount);
  const employerInss = r2(gross * EMPLOYER_INSS_RATE);
  const charges = { fgts: r2(fgts), employerInss, employerInssRate: EMPLOYER_INSS_RATE, total: r2(fgts + employerInss) };
  return {
    employees: payrolls.length, gross: r2(gross), netToPay: r2(net),
    totalDiscounts: r2(discountsByType.reduce((s, d) => s + d.amount, 0)),
    discountsByType, charges, companyCost: r2(gross + charges.total),
  };
}
