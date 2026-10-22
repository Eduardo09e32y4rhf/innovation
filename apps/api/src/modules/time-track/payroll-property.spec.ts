import { vi } from 'vitest';
import { PayrollCalculationService } from './payroll-calculation.service';
import { TimeClosingService } from './time-closing.service';
import { TimeCalculationRulesService } from './time-calculation-rules';

/** PRNG determinístico (mulberry32): mesma semente, mesmos casos em qualquer máquina. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const svc = new PayrollCalculationService();
const cents = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const isCents = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;

const SPECIAL_SALARIES = [0, 1, 1412, 1621, 1621.01, 2902.84, 2902.85, 4354.27, 4999.99, 5000, 5000.01, 7350, 7350.01, 8475.55, 8475.56, 50000];

function randomCase(r: () => number) {
  const int = (min: number, max: number) => Math.floor(r() * (max - min + 1)) + min;
  const salary = r() < 0.2 ? SPECIAL_SALARIES[int(0, SPECIAL_SALARIES.length - 1)] : cents(r() * 30000);
  const partial = r() < 0.2;
  return {
    salary,
    weeklyMinutes: int(20, 44) * 60,
    overtime50Minutes: int(0, 3000),
    overtime100Minutes: int(0, 1500),
    nightShiftMinutes: int(0, 3000),
    absenceMinutes: int(0, 4000),
    lateMinutes: int(0, 600),
    earlyLeaveMinutes: int(0, 600),
    payableWorkdays: int(15, 27),
    paidRestDays: int(3, 6),
    dsrLossDays: int(0, 4),
    dependents: int(0, 6),
    dsrEnabled: r() < 0.8,
    isPartialMonth: partial,
    scheduledMinutesInPeriod: partial ? int(1000, 12000) : undefined,
    vacationDaysInPeriod: r() < 0.3 ? int(0, 30) : 0,
    contractDaysInPeriod: r() < 0.15 ? int(0, 30) : 30,
    vacationTaxableGrosses: r() < 0.25 ? Array.from({ length: int(1, 3) }, () => cents(r() * 8000)) : [],
  };
}
const MONEY_FIELDS = ['salaryBase', 'overtime50Value', 'overtime100Value', 'nightShiftValue', 'dsrValue', 'absenceDiscount', 'lateDiscount', 'earlyLeaveDiscount', 'grossPay', 'inssBase', 'inssDiscount', 'irrfBase', 'irrfDiscount', 'fgtsBase', 'fgtsAmount', 'netPay'] as const;

describe('folha: propriedades em 2.500 casos aleatórios (semente fixa)', () => {
  const r = rng(20270101);
  const cases = Array.from({ length: 2500 }, () => randomCase(r));
  const results = cases.map((input) => ({ input, out: svc.calculate(input) }));

  it('nenhum valor negativo, NaN ou infinito; todos exatos em centavos', () => {
    const violations: string[] = [];
    for (const { input, out } of results) {
      for (const field of MONEY_FIELDS) {
        const v = out[field];
        if (!Number.isFinite(v) || v < 0 || !isCents(v)) violations.push(`${field}=${v} em ${JSON.stringify(input)}`);
      }
    }
    expect(violations.slice(0, 3)).toEqual([]);
  }, 60_000);

  it('bruto = salário + variáveis + DSR − descontos de jornada (±1 centavo)', () => {
    for (const { out } of results) {
      const expected = cents(Math.max(0, out.salaryBase + out.overtime50Value + out.overtime100Value + out.nightShiftValue + out.dsrValue - out.absenceDiscount - out.lateDiscount - out.earlyLeaveDiscount));
      expect(Math.abs(out.grossPay - expected)).toBeLessThanOrEqual(0.011);
    }
  });

  it('líquido = bruto − INSS − IRRF e nunca passa do bruto', () => {
    for (const { out } of results) {
      expect(Math.abs(out.netPay - cents(Math.max(0, out.grossPay - out.inssDiscount - out.irrfDiscount)))).toBeLessThanOrEqual(0.011);
      expect(out.netPay).toBeLessThanOrEqual(out.grossPay + 0.005);
    }
  });

  it('INSS nunca passa do teto 988,09; sem férias é exatamente a tabela progressiva do bruto', () => {
    for (const { input, out } of results) {
      expect(out.inssDiscount).toBeLessThanOrEqual(988.09);
      if (!input.vacationTaxableGrosses.length) expect(out.inssDiscount).toBe(svc.calculateInss(out.grossPay));
    }
  });

  it('FGTS = 8% do bruto; IRRF nunca passa de 27,5% da base', () => {
    for (const { out } of results) {
      expect(Math.abs(out.fgtsAmount - cents(out.grossPay * 0.08))).toBeLessThanOrEqual(0.011);
      expect(out.irrfDiscount).toBeLessThanOrEqual(out.irrfBase * 0.275 + 0.01);
    }
  });

  it('dias de férias e fora do contrato reduzem o salário do mês (30 − dias)/30, com piso em zero', () => {
    for (const { input, out } of results.filter((item) => !item.input.isPartialMonth)) {
      const unpaid = Math.min(30, 30 - input.contractDaysInPeriod + input.vacationDaysInPeriod);
      expect(Math.abs(out.salaryBase - cents((cents(input.salary) * (30 - unpaid)) / 30))).toBeLessThanOrEqual(0.011);
    }
  });

  it('mais salário nunca diminui bruto nem INSS (varredura 0 a 15.000, passo 7,13)', () => {
    let prev = { gross: -1, inss: -1 };
    for (let salary = 0; salary <= 15000; salary += 7.13) {
      const out = svc.calculate({ salary: cents(salary), weeklyMinutes: 2640, overtime50Minutes: 0, overtime100Minutes: 0, nightShiftMinutes: 0, absenceMinutes: 0, payableWorkdays: 22, paidRestDays: 4 });
      expect(out.grossPay).toBeGreaterThanOrEqual(prev.gross);
      expect(out.inssDiscount).toBeGreaterThanOrEqual(prev.inss);
      prev = { gross: out.grossPay, inss: out.inssDiscount };
    }
  });

  it('mais dependentes nunca aumenta o IRRF; o líquido não cai ao subir o bruto (sem saltos na faixa de isenção)', () => {
    for (const gross of [3000, 5000, 5000.01, 6000, 7350, 7350.01, 12000]) {
      let previousIrrf = Infinity;
      for (let dependents = 0; dependents <= 6; dependents++) {
        const { irrfDiscount } = svc.applyTaxes(gross, dependents);
        expect(irrfDiscount).toBeLessThanOrEqual(previousIrrf);
        previousIrrf = irrfDiscount;
      }
    }
    let previousNet = 0;
    for (let gross = 0; gross <= 12000; gross += 1.37) {
      const net = svc.applyTaxes(cents(gross), 0).netPay;
      expect(net).toBeGreaterThanOrEqual(previousNet - 0.02);
      previousNet = net;
    }
  });
});

// ---------------------------------------------------------------- calendário e fechamento
function closingPrisma(employeeOverrides: Record<string, unknown> = {}) {
  const created: any[] = [];
  const employee = {
    id: 'emp-1', name: 'Ana', salary: 5000, admissionDate: new Date('2020-01-01T00:00:00Z'), terminationDate: null,
    dailyWorkload: '08:00', workScale: '5x2', dependents: [], workScheduleRule: null, userSchedules: [], ...employeeOverrides,
  };
  const prisma: any = {
    company: { findUnique: vi.fn().mockResolvedValue({ payrollStartDay: 1 }) },
    employee: { findMany: vi.fn().mockResolvedValue([employee]) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    timeClosing: { findFirst: vi.fn().mockResolvedValue(null), deleteMany: vi.fn().mockResolvedValue({}), create: vi.fn().mockImplementation(async ({ data }: any) => { created.push(data); return { ...data, employee }; }) },
    payrollDeductionRule: { findMany: vi.fn().mockResolvedValue([]) },
    overtimeRule: { upsert: vi.fn().mockResolvedValue({ weekdayRate: 1.5, sundayHolidayRate: 2, nightShiftRate: 1.2, dsrEnabled: false }) },
    holiday: { findMany: vi.fn().mockResolvedValue([]) },
    timeTrack: { findMany: vi.fn().mockResolvedValue([]) },
    timeOccurrence: { findMany: vi.fn().mockResolvedValue([]) },
    userSchedule: { findMany: vi.fn().mockResolvedValue([]) },
    scheduleException: { findMany: vi.fn().mockResolvedValue([]) },
    vacation: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return { prisma, created };
}
const actor = { sub: 'rh', role: 'RH' } as any;
async function close(month: number, year: number, employee: Record<string, unknown> = {}) {
  const { prisma, created } = closingPrisma(employee);
  await new TimeClosingService(prisma, new PayrollCalculationService()).generate('c1', actor, { month, year } as any);
  return created[0];
}

describe('calendário: meses de 28, 29, 30 e 31 dias', () => {
  it.each([[1, 2030], [2, 2030], [2, 2032], [3, 2030], [4, 2030], [6, 2030], [9, 2030], [12, 2030]])('mês %i/%i: salário cheio, sem faltas (competência futura)', async (month, year) => {
    const closing = await close(month, year);
    expect(closing.salaryBase).toBe(5000);
    expect(closing.grossPay).toBe(5000);
    expect(closing.absences).toBe(0);
  });
});

describe('admissão e demissão no meio do mês (base comercial de 30 dias)', () => {
  it('admitido dia 11/03 (mês de 31 dias): 21 dias de contrato = 21/30 (3.500,00) e os dias anteriores não viram falta', async () => {
    const closing = await close(3, 2030, { admissionDate: new Date('2030-03-11T00:00:00Z') });
    expect(closing.salaryBase).toBe(3500);
    expect(closing.grossPay).toBe(3500);
    expect(closing.absences).toBe(0);
    expect(closing.absenceMinutes).toBe(0);
  });

  it('desligado dia 20/04: recebe 20/30 e os dias seguintes não viram falta', async () => {
    const closing = await close(4, 2030, { terminationDate: new Date('2030-04-20T00:00:00Z') });
    expect(closing.salaryBase).toBe(3333.33);
    expect(closing.absences).toBe(0);
  });

  it('admitido e desligado no mesmo mês de 31 dias (10 a 19): 10/30, sem tirar o dia 31 da conta', async () => {
    const closing = await close(5, 2030, { admissionDate: new Date('2030-05-10T00:00:00Z'), terminationDate: new Date('2030-05-19T00:00:00Z') });
    expect(closing.salaryBase).toBe(1666.67);
  });

  it('fevereiro bissexto (29 dias), admitido dia 15: 15 dias de contrato = 15/30', async () => {
    const closing = await close(2, 2032, { admissionDate: new Date('2032-02-15T00:00:00Z') });
    expect(closing.salaryBase).toBe(2500);
  });
});

describe('fuso America/Sao_Paulo: virada de dia e horário de verão histórico', () => {
  const rules = new TimeCalculationRulesService();
  const employee = { dailyWorkload: '08:00', standardEntry: '22:00', standardLunchStart: null, standardLunchReturn: null, standardExit: '05:00', workScale: '5x2' };
  const rule = { dailyMinutes: 420, weeklyMinutes: 2100, breakMinutes: 0, restDaysOfWeek: [0, 6], lateToleranceMinutes: 5, maxDailyOvertimeMinutes: 120, nightShiftEnabled: true };

  it('jornada 22:00 a 05:00 atravessa a meia-noite: 7h reais = 480 min noturnos computados (hora reduzida)', () => {
    const out = rules.calculateTotals({
      workDate: new Date('2026-07-14T00:00:00-03:00'),
      entryTime: new Date('2026-07-14T22:00:00-03:00'),
      exitTime: new Date('2026-07-15T05:00:00-03:00'),
    }, employee, rule, null);
    expect(out.nightShiftMinutes).toBe(480);
    expect(out.totalWorkedMinutes).toBe(420);
  });

  it('em 2018 (horário de verão, UTC-2) a mesma jornada local rende os mesmos 480 minutos', () => {
    // 15/12/2018 estava em horário de verão: 22:00 local = 00:00Z do dia seguinte.
    const out = rules.calculateTotals({
      workDate: new Date('2018-12-14T00:00:00-02:00'),
      entryTime: new Date('2018-12-14T22:00:00-02:00'),
      exitTime: new Date('2018-12-15T05:00:00-02:00'),
    }, employee, rule, null);
    expect(out.nightShiftMinutes).toBe(480);
  });

  it('ponto às 23:59 e às 00:01 caem em dias locais diferentes mesmo com UTC já no dia seguinte', () => {
    const out2359 = rules.calculateTotals({ workDate: new Date('2026-07-14T00:00:00-03:00'), entryTime: new Date('2026-07-14T23:59:00-03:00'), exitTime: new Date('2026-07-15T05:00:00-03:00') }, employee, rule, null);
    expect(out2359.nightShiftMinutes).toBeGreaterThan(0);
    // 00:01 local de 15/07 = 03:01Z de 15/07; 23:59 local de 14/07 = 02:59Z de 15/07 (UTC já no dia 15)
    expect(new Date('2026-07-14T23:59:00-03:00').toISOString().slice(0, 10)).toBe('2026-07-15');
    expect(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date('2026-07-14T23:59:00-03:00'))).toBe('2026-07-14');
    expect(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date('2026-07-15T00:01:00-03:00'))).toBe('2026-07-15');
  });
});
