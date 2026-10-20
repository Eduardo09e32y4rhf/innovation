import { vi } from 'vitest';
import { PayrollCalculationService } from './payroll-calculation.service';
import { TimeClosingService } from './time-closing.service';

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

// Competencia futura (jan/2027): nao ha faltas projetadas. Os dias de gozo saem do salario do mes (o recibo os paga).
const at = (day: string) => new Date(`2027-01-${day}T00:00:00Z`);
const dto = { month: 1, year: 2027 } as any;
const actor = { sub: 'user-rh', role: 'RH' } as any;

describe('fechamento de ponto: INSS unificado com ferias', () => {
  it('ferias pagas na competencia (10 dias): bruto 3.333,33 + recibo 2.222,23 = base 5.555,56; INSS do mes = 579,29 - 175,69 = 403,60', async () => {
    const { prisma, created } = buildPrisma([{ employeeId: 'emp-1', daysUsed: 10, startDate: at('11') }]);
    await new TimeClosingService(prisma, new PayrollCalculationService()).generate('company-1', actor, dto);
    expect(created).toHaveLength(1);
    expect(created[0].grossPay).toBe(3333.33);
    expect(created[0].inssBase).toBe(5555.56);
    expect(created[0].inssDiscount).toBe(403.6);
  });

  it('duas ferias fracionadas (10 + 20 dias = mes todo de gozo): abate o INSS de cada recibo (175,69 + 423,74) -> 734,85 - 599,43 = 135,42', async () => {
    const { prisma, created } = buildPrisma([{ employeeId: 'emp-1', daysUsed: 10, startDate: at('01') }, { employeeId: 'emp-1', daysUsed: 20, startDate: at('11') }]);
    await new TimeClosingService(prisma, new PayrollCalculationService()).generate('company-1', actor, dto);
    // recibos: 2.222,23 e 3.333,33 + 1.111,11 = 4.444,44 -> base de ferias 6.666,67; salario do mes zerado
    expect(created[0].grossPay).toBe(0);
    expect(created[0].inssBase).toBe(6666.67);
    expect(created[0].inssDiscount).toBe(135.42);
  });

  it('sem ferias o INSS continua isolado (501,51) e a base e o bruto', async () => {
    const { prisma, created } = buildPrisma([]);
    await new TimeClosingService(prisma, new PayrollCalculationService()).generate('company-1', actor, dto);
    expect(created[0].inssBase).toBe(5000);
    expect(created[0].inssDiscount).toBe(501.51);
  });

  it('so considera ferias aprovadas/concluidas, pagas e que tocam o periodo', async () => {
    const { prisma } = buildPrisma([]);
    await new TimeClosingService(prisma, new PayrollCalculationService()).generate('company-1', actor, dto);
    const where = prisma.vacation.findMany.mock.calls[0][0].where;
    expect(where.employeeId).toEqual({ in: ['emp-1'] });
    expect(where.status).toEqual({ in: ['APPROVED', 'COMPLETED'] });
    expect(where.payments).toEqual({ some: { status: 'PAID' } });
    expect(where.startDate.lte).toBeInstanceOf(Date);
    expect(where.endDate.gte).toBeInstanceOf(Date);
    expect(where.endDate.gte.getTime()).toBeLessThan(where.startDate.lte.getTime());
  });

  it('o registro gravado nao recebe campos desconhecidos pelo Prisma', async () => {
    const { prisma, created } = buildPrisma([{ employeeId: 'emp-1', daysUsed: 10, startDate: at('11') }]);
    await new TimeClosingService(prisma, new PayrollCalculationService()).generate('company-1', actor, dto);
    expect(created[0]).not.toHaveProperty('vacationTaxableGross');
    expect(created[0]).not.toHaveProperty('withheldOnVacation');
  });
});
