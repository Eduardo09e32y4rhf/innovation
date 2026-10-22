import { roundMoney } from '../../common/utils/money';

type Value = number | string | { toString(): string } | null;
export type PayrollForReconciliation = {
  grossSalary: Value; netSalary: Value; inssAmount: Value; irrfAmount: Value; fgtsAmount: Value;
  items: { type: string; amount: Value; isDeduction: boolean }[];
};

/** Confere os totais gravados contra os lançamentos exibidos no holerite. */
export function reconcilePayroll(row: PayrollForReconciliation) {
  const values = [row.grossSalary, row.netSalary, row.inssAmount, row.irrfAmount, row.fgtsAmount, ...row.items.map((item) => item.amount)];
  if (values.some((value) => value == null)) return false;
  const amounts = values.map(Number);
  if (amounts.some((value) => !Number.isFinite(value) || value < 0)) return false;
  const sum = (predicate: (item: PayrollForReconciliation['items'][number]) => boolean) => roundMoney(row.items.filter(predicate).reduce((total, item) => total + Number(item.amount), 0));
  const gross = roundMoney(Math.max(0, sum((item) => !item.isDeduction && item.type !== 'FGTS') - sum((item) => item.type === 'ABSENCE_DEDUCTION')));
  const net = roundMoney(Math.max(0, gross - Number(row.inssAmount) - Number(row.irrfAmount) - sum((item) => item.isDeduction && !['ABSENCE_DEDUCTION', 'INSS', 'IRRF'].includes(item.type))));
  const close = (actual: Value, expected: number) => Math.abs(Number(actual) - expected) <= 0.02;
  return close(row.grossSalary, gross) && close(row.netSalary, net) &&
    close(row.inssAmount, sum((item) => item.type === 'INSS')) &&
    close(row.irrfAmount, sum((item) => item.type === 'IRRF')) &&
    close(row.fgtsAmount, sum((item) => item.type === 'FGTS'));
}
