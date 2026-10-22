import { describe, expect, it } from 'vitest';
import { accountingTotals, type ClosingAmount, type PayrollAmount } from './accounting-totals';

const closing = (employeeId: string, grossPay: number): ClosingAmount => ({ companyId: 'c', employeeId, status: 'APPROVED', grossPay, netPay: grossPay - 100, inssDiscount: 80, irrfDiscount: 20, fgtsAmount: 80 });
const payroll = (employeeId: string, grossSalary: number, status = 'APPROVED'): PayrollAmount => ({ companyId: 'c', employeeId, status, grossSalary, netSalary: grossSalary - 200, inssAmount: 150, irrfAmount: 50, fgtsAmount: 160 });

describe('totais contábeis', () => {
  it('usa a folha no lugar da previsão do ponto do mesmo funcionário', () => {
    expect(accountingTotals([closing('a', 1000), closing('b', 500)], [payroll('a', 2000)])).toMatchObject({ gross: 2500, net: 2200, inss: 230, irrf: 70, fgts: 240, estimatedClosings: 1, payrolls: 1 });
  });

  it('ignora folha cancelada e mantém o fechamento como previsão', () => {
    expect(accountingTotals([closing('a', 1000)], [payroll('a', 2000, 'CANCELLED')])).toMatchObject({ gross: 1000, estimatedClosings: 1, payrolls: 0 });
  });

  it('mantém o fechamento de outro ciclo do mesmo funcionário', () => {
    const first = { ...closing('a', 1000), periodStart: new Date('2026-10-01'), periodEnd: new Date('2026-10-15') };
    const second = { ...payroll('a', 2000), periodStart: new Date('2026-10-16'), periodEnd: new Date('2026-10-31') };
    expect(accountingTotals([first], [second])).toMatchObject({ gross: 3000, estimatedClosings: 1, payrolls: 1 });
  });
});
