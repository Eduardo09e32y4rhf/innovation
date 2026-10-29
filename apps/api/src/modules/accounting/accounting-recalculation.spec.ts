import { describe, expect, it, vi } from 'vitest';
import { AccountingHubService } from './accounting-hub.service';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';

describe('recálculo de uma folha pela contabilidade', () => {
  it('atualiza DSR, descontos, tributos e FGTS mantendo os lançamentos conciliados', async () => {
    const items: any[] = [
      { id: 'base', type: 'BASE_SALARY', description: 'Salário base', amount: 3000, isDeduction: false },
      { id: 'extra', type: 'OVERTIME', description: 'Horas extras', amount: 100, isDeduction: false },
      { id: 'dsr', type: 'OTHER_EARNING', description: 'DSR sobre horas variáveis', amount: 18.18, isDeduction: false },
      { id: 'advance', type: 'ADVANCE', description: 'Adiantamento', amount: 100, isDeduction: true },
      { id: 'inss', type: 'INSS', description: 'INSS', amount: 0, isDeduction: true },
      { id: 'irrf', type: 'IRRF', description: 'IRRF', amount: 0, isDeduction: true },
      { id: 'fgts', type: 'FGTS', description: 'FGTS', amount: 0, isDeduction: false },
    ];
    const payroll = { id: 'p', companyId: 'c', referenceMonth: 10, referenceYear: 2026, periodStart: new Date('2026-10-01T00:00:00Z'), periodEnd: new Date('2026-10-31T00:00:00Z'), baseSalary: 3000, overtimeAmount: 300, nightShiftAmount: 0, employee: { dependents: '[]', workScale: '5X2', workScheduleRule: null } };
    const tx: any = {
      payrollItem: {
        findFirst: vi.fn(({ where }: any) => Promise.resolve(items.find((item) => item.type === where.type && (!where.description || item.description.startsWith(where.description.startsWith))))),
        findMany: vi.fn().mockImplementation(() => Promise.resolve(items)),
        update: vi.fn(({ where, data }: any) => { Object.assign(items.find((item) => item.id === where.id), data); return Promise.resolve(); }),
        create: vi.fn(({ data }: any) => { items.push({ ...data, id: `new-${items.length}` }); return Promise.resolve(); }),
        delete: vi.fn(({ where }: any) => { items.splice(items.findIndex((item) => item.id === where.id), 1); return Promise.resolve(); }),
      },
      payroll: { update: vi.fn(({ data }: any) => Promise.resolve(data)) },
    };
    const service = new AccountingHubService({} as any, new PayrollCalculationService(), {} as any, {} as any, {} as any, {} as any);
    const { result } = await (service as any).recalcPayrollRow(tx, payroll);
    expect(items.find((item) => item.id === 'dsr').amount).toBe(54.55);
    expect(result.grossPay).toBe(3354.55);
    expect(result.netPay).toBeCloseTo(result.grossPay - result.inssDiscount - result.irrfDiscount - 100, 2);
    expect(items.find((item) => item.id === 'inss').amount).toBe(result.inssDiscount);
    expect(items.find((item) => item.id === 'fgts').amount).toBe(result.fgtsAmount);
    expect(tx.payroll.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ grossSalary: 3354.55, netSalary: result.netPay }) }));
  });
});
