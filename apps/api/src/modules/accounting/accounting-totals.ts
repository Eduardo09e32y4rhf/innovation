import { roundMoney } from '../../common/utils/money';

type Amount = number | string | { toString(): string } | null;
export type ClosingAmount = { companyId: string; employeeId: string; status: string; employee?: { name?: string } | null; periodStart?: Date | null; periodEnd?: Date | null; grossPay: Amount; netPay: Amount; inssDiscount: Amount; irrfDiscount: Amount; fgtsAmount: Amount };
export type PayrollAmount = { companyId: string; employeeId: string; status: string; employee?: { name?: string } | null; periodStart?: Date | null; periodEnd?: Date | null; grossSalary: Amount; netSalary: Amount; inssAmount: Amount; irrfAmount: Amount; fgtsAmount: Amount };

/** A folha substitui a previsão do ponto para o mesmo funcionário na competência. */
export function accountingEntries<C extends ClosingAmount, P extends PayrollAmount>(closings: C[], payrolls: P[]) {
  const activePayrolls = payrolls.filter((row) => row.status !== 'CANCELLED');
  const estimates = closings.filter((closing) => !activePayrolls.some((payroll) =>
    payroll.companyId === closing.companyId && payroll.employeeId === closing.employeeId &&
    (!payroll.periodStart || !payroll.periodEnd || !closing.periodStart || !closing.periodEnd ||
      (payroll.periodStart <= closing.periodEnd && payroll.periodEnd >= closing.periodStart))));
  return { activePayrolls, estimates };
}

export function accountingTotals(closings: ClosingAmount[], payrolls: PayrollAmount[]) {
  const { activePayrolls, estimates } = accountingEntries(closings, payrolls);
  const amount = (value: Amount) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  const sum = (rows: any[], key: string) => roundMoney(rows.reduce((total, row) => total + amount(row[key]), 0));
  return {
    gross: roundMoney(sum(activePayrolls, 'grossSalary') + sum(estimates, 'grossPay')),
    net: roundMoney(sum(activePayrolls, 'netSalary') + sum(estimates, 'netPay')),
    inss: roundMoney(sum(activePayrolls, 'inssAmount') + sum(estimates, 'inssDiscount')),
    irrf: roundMoney(sum(activePayrolls, 'irrfAmount') + sum(estimates, 'irrfDiscount')),
    fgts: roundMoney(sum(activePayrolls, 'fgtsAmount') + sum(estimates, 'fgtsAmount')),
    estimatedClosings: estimates.length,
    payrolls: activePayrolls.length,
  };
}
