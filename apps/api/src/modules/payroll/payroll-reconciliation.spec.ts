import { describe, expect, it } from 'vitest';
import { reconcilePayroll } from './payroll-reconciliation';

describe('conciliação da folha', () => {
  const row = {
    grossSalary: 3210, netSalary: 2800, inssAmount: 300, irrfAmount: 10, fgtsAmount: 256.8,
    items: [
      { type: 'BASE_SALARY', amount: 3000, isDeduction: false },
      { type: 'OVERTIME', amount: 300, isDeduction: false },
      { type: 'ABSENCE_DEDUCTION', amount: 90, isDeduction: true },
      { type: 'ADVANCE', amount: 100, isDeduction: true },
      { type: 'INSS', amount: 300, isDeduction: true },
      { type: 'IRRF', amount: 10, isDeduction: true },
      { type: 'FGTS', amount: 256.8, isDeduction: false },
    ],
  };

  it('separa FGTS patronal e faltas já abatidas do bruto', () => expect(reconcilePayroll(row)).toBe(true));
  it('detecta líquido ou guia divergente dos lançamentos', () => {
    expect(reconcilePayroll({ ...row, netSalary: 2900 })).toBe(false);
    expect(reconcilePayroll({ ...row, fgtsAmount: 250 })).toBe(false);
  });
});
