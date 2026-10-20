import { PayrollCalculationService } from './payroll-calculation.service';

const svc = new PayrollCalculationService();
const base = {
  weeklyMinutes: 44 * 60,
  overtime50Minutes: 0,
  overtime100Minutes: 0,
  nightShiftMinutes: 0,
  absenceMinutes: 0,
  payableWorkdays: 22,
  paidRestDays: 4,
};

describe('P0 QA — cálculo da folha (regras 2026)', () => {
  it('INSS do salário mínimo 2026 (1.621,00 × 7,5%)', () => {
    expect(svc.calculateInss(1621)).toBe(121.58);
  });

  it('INSS progressivo em 3.000,00', () => {
    // 1621×7,5% + 1281,84×9% + 97,16×12% = 121,575 + 115,3656 + 11,6592
    expect(svc.calculateInss(3000)).toBe(248.6);
  });

  it('INSS limitado ao teto (8.475,55)', () => {
    expect(svc.calculateInss(20000)).toBe(svc.calculateInss(8475.55));
    expect(svc.calculateInss(8475.55)).toBe(988.09);
  });

  it('IRRF zerado até 5.000,00 de rendimento (Lei 15.270/2025)', () => {
    const r = svc.applyTaxes(5000, 0);
    expect(r.irrfDiscount).toBe(0);
  });

  it('IRRF com redutor parcial entre 5.000 e 7.350', () => {
    const r = svc.applyTaxes(6000, 0);
    const inss = svc.calculateInss(6000);
    const irBase = Math.round((6000 - inss) * 100) / 100;
    const table = irBase * 0.275 - 908.73;
    const reducer = 978.62 - 0.133145 * 6000;
    expect(r.irrfDiscount).toBeCloseTo(table - reducer, 1);
  });

  it('IRRF sem redutor acima de 7.350', () => {
    const r = svc.applyTaxes(10000, 0);
    const irBase = 10000 - svc.calculateInss(10000);
    expect(r.irrfDiscount).toBeCloseTo(irBase * 0.275 - 908.73, 1);
  });

  it('dependentes reduzem o IRRF', () => {
    expect(svc.applyTaxes(10000, 2).irrfDiscount).toBeLessThan(svc.applyTaxes(10000, 0).irrfDiscount);
  });

  it('FGTS 8% sobre o bruto', () => {
    expect(svc.applyTaxes(3333.33, 0).fgtsAmount).toBe(266.67);
  });

  it('HE 50% / 100%, noturno 20% e DSR reflexo', () => {
    const r = svc.calculate({ ...base, salary: 2200, overtime50Minutes: 600, overtime100Minutes: 120, nightShiftMinutes: 300 });
    // divisor 220 → hora R$ 10
    expect(r.hourlyRate).toBe(10);
    expect(r.overtime50Value).toBe(150);
    expect(r.overtime100Value).toBe(40);
    expect(r.nightShiftValue).toBe(10);
    expect(r.dsrValue).toBe(36.36); // 200/22×4
    expect(r.grossPay).toBe(2436.36);
  });

  it('faltas, atrasos e perda de DSR descontam do bruto antes dos impostos', () => {
    const r = svc.calculate({ ...base, salary: 2200, absenceMinutes: 480, lateMinutes: 30, dsrLossDays: 1 });
    expect(r.absenceDiscount).toBe(153.33); // 80 + 2200/30
    expect(r.lateDiscount).toBe(5);
    expect(r.grossPay).toBe(2041.67);
    expect(r.inssBase).toBe(r.grossPay);
  });

  it('mês parcial (admissão no meio) usa horas da escala do período', () => {
    const r = svc.calculate({ ...base, salary: 2200, isPartialMonth: true, scheduledMinutesInPeriod: 11 * 8 * 60 });
    expect(r.salaryBase).toBe(880);
  });

  it('salário zero/negativo não gera valores negativos nem NaN', () => {
    for (const salary of [0, -100, Number.NaN]) {
      const r = svc.calculate({ ...base, salary });
      for (const v of Object.values(r)) if (typeof v === 'number') expect(Number.isFinite(v) && v >= 0).toBe(true);
    }
  });

  it('folha (calculate) e recálculo contábil (applyTaxes) dão o mesmo resultado', () => {
    const calc = svc.calculate({ ...base, salary: 7321.45, overtime50Minutes: 437, nightShiftMinutes: 95, absenceMinutes: 120, lateMinutes: 17, dependents: 1 });
    const acc = svc.applyTaxes(calc.grossPay, 1);
    expect(acc.inssDiscount).toBe(calc.inssDiscount);
    expect(acc.irrfDiscount).toBe(calc.irrfDiscount);
    expect(acc.fgtsAmount).toBe(calc.fgtsAmount);
    expect(acc.netPay).toBe(calc.netPay);
  });

  it('soma dos itens do holerite = bruto (sem erro de centavo)', () => {
    for (let i = 0; i < 500; i++) {
      const salary = Math.round((1621 + Math.random() * 15000) * 100) / 100;
      const r = svc.calculate({ ...base, salary, overtime50Minutes: Math.floor(Math.random() * 900), overtime100Minutes: Math.floor(Math.random() * 300), nightShiftMinutes: Math.floor(Math.random() * 600), absenceMinutes: Math.floor(Math.random() * 960), lateMinutes: Math.floor(Math.random() * 120) });
      const items = r.salaryBase + r.overtime50Value + r.overtime100Value + r.nightShiftValue + r.dsrValue - r.absenceDiscount - r.lateDiscount - r.earlyLeaveDiscount;
      expect(Math.abs(Math.max(0, Math.round(items * 100) / 100) - r.grossPay)).toBeLessThan(0.005);
    }
  });
});
