import { vi } from 'vitest';
import { PayrollCalculationService } from './payroll-calculation.service';
import { TimeClosingService } from './time-closing.service';
import { vacationEnjoymentDates, vacationTaxableGross } from '../vacations/vacation-tax-base';

/**
 * Conta do pagamento em dobro (salário 5.000, 10 dias de gozo em jan/2027):
 *   recibo de férias   = 5.000/30 × 10 = 1.666,67 + 1/3 (555,56) = 2.222,23
 *   salário do mês ANTES do conserto = 5.000,00 (cheio)  -> 5.000,00 + 2.222,23 = 7.222,23
 *   devido (30 dias)   = 5.000/30 × 20 = 3.333,33 + 2.222,23 = 5.555,56
 *   pagamento em dobro = 7.222,23 − 5.555,56 = 1.666,67  (os 10 dias de gozo pagos duas vezes)
 * Fonte: CLT art. 142 (remuneração do gozo) e art. 145 (pagamento antecipado); o salário do mês cobre só os dias não gozados.
 */
function buildPrisma(vacations: Array<{ employeeId: string; daysUsed: number; startDate: Date }>) {
  const created: any[] = [];
  const employee = {
    id: 'emp-1', name: 'Ana', salary: 5000, admissionDate: new Date('2020-01-01T00:00:00Z'), terminationDate: null,
    dailyWorkload: '08:00', workScale: '5x2', dependents: [], workScheduleRule: null, userSchedules: [],
  };
  const prisma: any = {
    company: { findUnique: vi.fn().mockResolvedValue({ payrollStartDay: 1 }) },
    employee: { findMany: vi.fn().mockResolvedValue([employee]) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    timeClosing: {
      findFirst: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockImplementation(async ({ data }: any) => { created.push(data); return { ...data, employee }; }),
    },
    payrollDeductionRule: { findMany: vi.fn().mockResolvedValue([]) },
    overtimeRule: { upsert: vi.fn().mockResolvedValue({ weekdayRate: 1.5, sundayHolidayRate: 2, nightShiftRate: 1.2, dsrEnabled: false }) },
    holiday: { findMany: vi.fn().mockResolvedValue([]) },
    timeTrack: { findMany: vi.fn().mockResolvedValue([]) },
    timeOccurrence: { findMany: vi.fn().mockResolvedValue([]) },
    userSchedule: { findMany: vi.fn().mockResolvedValue([]) },
    scheduleException: { findMany: vi.fn().mockResolvedValue([]) },
    vacation: { findMany: vi.fn().mockResolvedValue(vacations) },
  };
  return { prisma, created };
}
const dto = { month: 1, year: 2027 } as any;
const actor = { sub: 'user-rh', role: 'RH' } as any;
const run = async (vacations: any[]) => {
  const { prisma, created } = buildPrisma(vacations);
  await new TimeClosingService(prisma, new PayrollCalculationService()).generate('company-1', actor, dto);
  return created[0];
};

describe('férias x salário do mês (sem pagamento em dobro)', () => {
  it('o recibo de 10 dias vale 2.222,23', () => {
    expect(vacationTaxableGross(5000, 10)).toBe(2222.23);
  });

  it('10 dias de gozo: o salário do mês cobre só 20/30 (3.333,33), não 5.000', async () => {
    const closing = await run([{ employeeId: 'emp-1', daysUsed: 10, startDate: new Date('2027-01-11T00:00:00Z') }]);
    expect(closing.salaryBase).toBe(3333.33);
    expect(closing.grossPay).toBe(3333.33);
    // mês + recibo = devido (5.555,56), e não 7.222,23
    expect(Math.round((closing.grossPay + vacationTaxableGross(5000, 10)) * 100) / 100).toBe(5555.56);
  });

  it('sem férias nada muda (5.000 cheios)', async () => {
    const closing = await run([]);
    expect(closing.salaryBase).toBe(5000);
    expect(closing.grossPay).toBe(5000);
  });

  it('INSS unificado passa a usar o bruto sem a duplicidade: base = 3.333,33 + 2.222,23', async () => {
    const closing = await run([{ employeeId: 'emp-1', daysUsed: 10, startDate: new Date('2027-01-11T00:00:00Z') }]);
    expect(closing.inssBase).toBe(5555.56);
    const svc = new PayrollCalculationService();
    expect(closing.inssDiscount).toBe(svc.calculateInssWithVacation(3333.33, [2222.23]).due);
  });

  it('férias iniciadas no mês anterior e que invadem o mês: desconta só os dias dentro da competência, sem INSS do recibo', async () => {
    // 20 dias a partir de 22/12/2026 -> 22/12..10/01: 10 dias em janeiro
    const closing = await run([{ employeeId: 'emp-1', daysUsed: 20, startDate: new Date('2026-12-22T00:00:00Z') }]);
    expect(closing.salaryBase).toBe(3333.33);
    expect(closing.inssBase).toBe(3333.33);
  });

  it('30 dias de gozo no mês: salário do mês zera, sem valor negativo', async () => {
    const closing = await run([{ employeeId: 'emp-1', daysUsed: 30, startDate: new Date('2027-01-01T00:00:00Z') }]);
    expect(closing.salaryBase).toBe(0);
    expect(closing.grossPay).toBe(0);
    expect(closing.netPay).toBeGreaterThanOrEqual(0);
  });

  it('dias de gozo nunca viram falta nem perdem DSR', async () => {
    const closing = await run([{ employeeId: 'emp-1', daysUsed: 10, startDate: new Date('2027-01-11T00:00:00Z') }]);
    expect(closing.absences).toBe(0);
    expect(closing.absenceMinutes).toBe(0);
  });

  it('só os dias de gozo contam: abono vendido (soldDays) é trabalhado', () => {
    expect(vacationEnjoymentDates({ startDate: new Date('2027-01-11T00:00:00Z'), daysUsed: 3 }).map((d) => d.toISOString().slice(0, 10)))
      .toEqual(['2027-01-11', '2027-01-12', '2027-01-13']);
    expect(vacationEnjoymentDates({ startDate: new Date('2027-01-11T00:00:00Z'), daysUsed: 0 })).toEqual([]);
  });
});
