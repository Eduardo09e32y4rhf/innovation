import { describe, expect, it } from 'vitest';
import { monthlySalaryFraction } from './salary-period';
import { PayrollCalculationService } from './payroll-calculation.service';

describe('salário mensal em ciclos', () => {
  const date = (day: string) => new Date(`${day}T00:00:00.000Z`);

  it('duas metades de um mês somam exatamente um salário', () => {
    const first = monthlySalaryFraction(date('2026-10-01'), date('2026-10-15'));
    const second = monthlySalaryFraction(date('2026-10-16'), date('2026-10-31'));
    expect(first + second).toBeCloseTo(1, 12);
    const engine = new PayrollCalculationService();
    const input = { salary: 3100, weeklyMinutes: 2400, overtime50Minutes: 0, overtime100Minutes: 0, nightShiftMinutes: 0, absenceMinutes: 0, payableWorkdays: 10, paidRestDays: 2 };
    expect(engine.calculate({ ...input, salaryPeriodFraction: first }).salaryBase).toBe(1500);
    expect(engine.calculate({ ...input, salaryPeriodFraction: second }).salaryBase).toBe(1600);
  });

  it('ciclo mensal que atravessa dois meses corresponde a um salário', () => {
    expect(monthlySalaryFraction(date('2026-10-16'), date('2026-11-15'))).toBe(1);
    expect(monthlySalaryFraction(date('2026-02-01'), date('2026-02-28'))).toBe(1);
    expect(monthlySalaryFraction(date('2026-10-20'), date('2026-11-15'))).toBeCloseTo(12 / 31 + 15 / 30, 12);
  });

  it('desconta DSR perdido pelo valor diário do salário contratual em ciclo parcial', () => {
    const result = new PayrollCalculationService().calculate({ salary: 3000, weeklyMinutes: 2400, overtime50Minutes: 0, overtime100Minutes: 0, nightShiftMinutes: 0, absenceMinutes: 0, payableWorkdays: 10, paidRestDays: 2, salaryPeriodFraction: 0.5, dsrLossDays: 1 });
    expect(result.salaryBase).toBe(1500);
    expect(result.absenceDiscount).toBe(100);
  });
});
