import { PayrollCalculationService } from './payroll-calculation.service';
import { BadRequestException } from '@nestjs/common';
import { vi } from 'vitest';

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

  it('deduz corretamente os descontos de atrasos e saidas antecipadas do salario bruto', () => {
    const result = service.calculate({
      salary: 4400, // 220h => R$ 20/h
      weeklyMinutes: 2640,
      overtime50Minutes: 0,
      overtime100Minutes: 0,
      nightShiftMinutes: 0,
      absenceMinutes: 0,
      lateMinutes: 60, // 1h atraso => R$ 20 desconto
      earlyLeaveMinutes: 120, // 2h saida antecipada => R$ 40 desconto
      payableWorkdays: 22,
      paidRestDays: 8,
    });
    expect(result.hourlyRate).toBe(20);
    expect(result.lateDiscount).toBe(20);
    expect(result.earlyLeaveDiscount).toBe(40);
    expect(result.grossPay).toBe(4340); // 4400 - 60
  });

  it('resolve a tabela ativa pela competencia e registra suas versoes no calculo', async () => {
    const prisma: any = {
      payrollTaxTable: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'inss-2026',
            taxType: 'INSS',
            version: 'INSS_2026_DB',
            brackets: [
              { limit: 1621, rate: 0.075 },
              { limit: 8475.55, rate: 0.14 },
            ],
            parameters: null,
          },
          {
            id: 'irrf-2026',
            taxType: 'IRRF',
            version: 'IRRF_2026_DB',
            brackets: [
              { limit: 2428.8, rate: 0, deduction: 0 },
              { limit: null, rate: 0.275, deduction: 908.73 },
            ],
            parameters: {
              dependentDeduction: 189.59,
              simplifiedDeduction: 607.2,
              fullExemptionLimit: 5000,
              partialExemptionLimit: 7350,
              partialReductionBase: 978.62,
              partialReductionFactor: 0.133145,
            },
          },
        ]),
      },
    };
    const dbService = new PayrollCalculationService(prisma);
    const taxContext = await dbService.resolveTaxContext(new Date('2026-07-31T00:00:00.000Z'));
    const result = dbService.calculate({
      salary: 3000,
      weeklyMinutes: 2640,
      overtime50Minutes: 0,
      overtime100Minutes: 0,
      nightShiftMinutes: 0,
      absenceMinutes: 0,
      payableWorkdays: 22,
      paidRestDays: 8,
      taxContext,
    });

    expect(prisma.payrollTaxTable.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ active: true }),
    }));
    expect(result.calculationVersion).toContain('INSS_2026_DB');
    expect(result.calculationVersion).toContain('IRRF_2026_DB');
  });

  it('bloqueia o fechamento oficial quando falta tabela para a competencia', async () => {
    const prisma: any = {
      payrollTaxTable: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const dbService = new PayrollCalculationService(prisma);

    await expect(dbService.resolveTaxContext(new Date('2027-01-31T00:00:00.000Z')))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
