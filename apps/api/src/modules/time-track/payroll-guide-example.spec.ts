import { describe, expect, it } from 'vitest';
import { PayrollCalculationService } from './payroll-calculation.service';

/** Exemplo do guia de folha (2026): bruto R$ 6.000, sem dependentes. */
describe('guia de folha 2026: exemplo completo', () => {
  const service = new PayrollCalculationService({} as never);
  it('INSS, IRRF com redutor e líquido batem com o guia', () => {
    const out = service.applyTaxes(6000, 0);
    expect(out.inssDiscount).toBeCloseTo(641.51, 1);
    expect(out.irrfDiscount).toBeCloseTo(385.11, 0);
    expect(out.netPay).toBeCloseTo(4973.38, 0);
    expect(out.fgtsAmount).toBe(480);
  });
});
