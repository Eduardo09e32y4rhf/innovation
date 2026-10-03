import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PayrollCalculationService, type PayrollTaxContext } from '../time-track/payroll-calculation.service';
import { AccountingRulesService } from './accounting-rules.service';

const D = PayrollCalculationService;
const context = (overrides: Partial<PayrollTaxContext> = {}): PayrollTaxContext => ({
  inss: { id: 'i', version: 'T1', brackets: D.DEFAULT_INSS },
  irrf: { id: 'r', version: 'T1', brackets: D.DEFAULT_IRRF, parameters: D.DEFAULT_IRRF_PARAMETERS },
  fgts: { id: 'f', version: 'T1', rate: 0.08 },
  params: { id: 'p', version: 'T1', ...D.DEFAULT_RULE_PARAMS },
  ...overrides,
});
const base = { salary: 5000, weeklyMinutes: 2640, overtime50Minutes: 600, overtime100Minutes: 0, nightShiftMinutes: 0, absenceMinutes: 0, payableWorkdays: 22, paidRestDays: 4 };

describe('motor de folha usa as regras configuradas', () => {
  const engine = new PayrollCalculationService();

  it('FGTS vem da alíquota cadastrada, não de 8% fixo', () => {
    const at8 = engine.calculate({ ...base, taxContext: context() });
    const at10 = engine.calculate({ ...base, taxContext: context({ fgts: { id: 'f', version: 'T2', rate: 0.1 } }) });
    expect(at8.fgtsAmount).toBeCloseTo(at8.grossPay * 0.08, 2);
    expect(at10.fgtsAmount).toBeCloseTo(at10.grossPay * 0.1, 2);
    expect(at10.calculationVersion).toContain('FGTS:T2');
  });

  it('piso de hora extra e divisor mensal vêm dos parâmetros', () => {
    const standard = engine.calculate({ ...base, taxContext: context() });
    const higher = engine.calculate({ ...base, taxContext: context({ params: { id: 'p', version: 'T2', ...D.DEFAULT_RULE_PARAMS, overtime50MinFactor: 1.6 } }) });
    expect(higher.overtime50Value).toBeGreaterThan(standard.overtime50Value);
    expect(higher.overtime50Value / standard.overtime50Value).toBeCloseTo(1.6 / 1.5, 2);
  });

  it('applyTaxes é idêntico ao fechamento para o mesmo bruto', () => {
    const full = engine.calculate({ ...base, dependents: 1, taxContext: context() });
    const taxes = engine.applyTaxes(full.grossPay, 1, context());
    expect(taxes).toMatchObject({ grossPay: full.grossPay, inssDiscount: full.inssDiscount, irrfDiscount: full.irrfDiscount, fgtsAmount: full.fgtsAmount, netPay: full.netPay });
  });

  it('sem tabelas cadastradas usa o padrão embutido e NÃO lança 400', async () => {
    const prisma = { payrollTaxTable: { findMany: vi.fn().mockResolvedValue([]) } } as any;
    const ctx = await new PayrollCalculationService(prisma).resolveTaxContext(new Date('2026-03-01'));
    expect(ctx.builtin).toEqual(['INSS', 'IRRF', 'FGTS', 'PAYROLL_PARAMS']);
    expect(ctx.fgts?.rate).toBe(0.08);
    expect(ctx.inss.brackets.length).toBeGreaterThan(0);
  });

  it('lê FGTS e parâmetros do banco quando existem', async () => {
    const rows = [
      { id: 'f1', taxType: 'FGTS', version: '2027', brackets: [{ limit: null, rate: 0.09 }], parameters: null },
      { id: 'p1', taxType: 'PAYROLL_PARAMS', version: '2027', brackets: [], parameters: { overtime50MinFactor: 1.7, overtime100MinFactor: 2.1, nightMinPercent: 25, monthlyDivisorFactor: 5 } },
    ];
    const prisma = { payrollTaxTable: { findMany: vi.fn().mockResolvedValue(rows) } } as any;
    const ctx = await new PayrollCalculationService(prisma).resolveTaxContext(new Date('2026-03-01'));
    expect(ctx.fgts).toMatchObject({ version: '2027', rate: 0.09 });
    expect(ctx.params).toMatchObject({ overtime50MinFactor: 1.7, nightMinPercent: 25 });
    expect(ctx.builtin).toEqual(['INSS', 'IRRF']);
  });
});

describe('validação das regras contábeis', () => {
  const service = new AccountingRulesService({ payrollTaxTable: { findFirst: vi.fn().mockResolvedValue(null) } } as any, new PayrollCalculationService());
  const actor = { sub: 'u', companyId: 'c', role: 'CONTABIL', email: 'x@x.test' } as any;

  it('INSS exige limites crescentes e rejeita alíquota absurda', async () => {
    await expect(service.saveVersion(actor, { taxType: 'INSS', effectiveFrom: '2027-01-01', brackets: [{ limit: 2000, rate: 0.075 }, { limit: 1500, rate: 0.09 }] } as any)).rejects.toThrow(/crescentes/);
    await expect(service.saveVersion(actor, { taxType: 'INSS', effectiveFrom: '2027-01-01', brackets: [{ limit: 2000, rate: 7.5 }] } as any)).rejects.toThrow(/alíquota/i);
  });

  it('parâmetros de folha respeitam os pisos da CLT', async () => {
    await expect(service.saveVersion(actor, { taxType: 'PAYROLL_PARAMS', effectiveFrom: '2027-01-01', parameters: { overtime50MinFactor: 1.2, overtime100MinFactor: 2, nightMinPercent: 20, monthlyDivisorFactor: 5 } } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.saveVersion(actor, { taxType: 'PAYROLL_PARAMS', effectiveFrom: '2027-01-01', parameters: { overtime50MinFactor: 1.5, overtime100MinFactor: 2, nightMinPercent: 10, monthlyDivisorFactor: 5 } } as any)).rejects.toThrow(/20%/);
  });

  it('FGTS exige alíquota', async () => {
    await expect(service.saveVersion(actor, { taxType: 'FGTS', effectiveFrom: '2027-01-01' } as any)).rejects.toThrow(/alíquota/i);
  });
});
