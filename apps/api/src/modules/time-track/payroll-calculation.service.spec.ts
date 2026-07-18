import { PayrollCalculationService } from './payroll-calculation.service';

describe('PayrollCalculationService - tabelas 2026', () => {
  const service = new PayrollCalculationService();

  it('calcula INSS progressivo de R$ 5.000,00', () => {
    expect(service.calculateInss(5000)).toBe(501.51);
  });

  it('zera IRRF para rendimento tributavel de R$ 5.000,00 pela reducao de 2026', () => {
    const result = service.calculate({
      salary: 5000,
      weeklyMinutes: 2640,
      overtime50Minutes: 0,
      overtime100Minutes: 0,
      nightShiftMinutes: 0,
      absenceMinutes: 0,
      payableWorkdays: 22,
      paidRestDays: 9,
    });
    expect(result.inssDiscount).toBe(501.51);
    expect(result.irrfDiscount).toBe(0);
    expect(result.fgtsAmount).toBe(400);
    expect(result.netPay).toBe(4498.49);
  });

  it('usa divisor 200 para jornada semanal de 40h e soma verbas sem duplicar salario', () => {
    const result = service.calculate({
      salary: 4000,
      weeklyMinutes: 2400,
      overtime50Minutes: 120,
      overtime100Minutes: 60,
      nightShiftMinutes: 420,
      absenceMinutes: 60,
      payableWorkdays: 22,
      paidRestDays: 9,
    });
    expect(result.monthlyDivisor).toBe(200);
    expect(result.hourlyRate).toBe(20);
    expect(result.overtime50Value).toBe(60);
    expect(result.overtime100Value).toBe(40);
    expect(result.nightShiftValue).toBe(28);
    expect(result.absenceDiscount).toBe(20);
    expect(result.grossPay).toBeGreaterThan(4000);
    expect(result.fgtsAmount).toBeCloseTo(result.grossPay * 0.08, 2);
  });

  it('protege os adicionais minimos legais mesmo com configuracao inferior', () => {
    const result = service.calculate({
      salary: 2200,
      weeklyMinutes: 2640,
      overtime50Minutes: 60,
      overtime100Minutes: 60,
      nightShiftMinutes: 60,
      absenceMinutes: 0,
      payableWorkdays: 22,
      paidRestDays: 0,
      overtime50Factor: 1.1,
      overtime100Factor: 1.5,
      nightShiftPercent: 10,
    });
    expect(result.overtime50Value).toBe(15);
    expect(result.overtime100Value).toBe(20);
    expect(result.nightShiftValue).toBe(2);
  });
});
