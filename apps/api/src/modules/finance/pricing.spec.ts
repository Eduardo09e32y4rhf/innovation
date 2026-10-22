import { describe, expect, it } from 'vitest';
import { computePrice, planPricingForSubscription, prorationDays, saoPauloDayNumber, toCents, PricingError } from './pricing';

// Catalogo de referencia (seed-plans-catalog): valores em reais; as contas abaixo estao em centavos.
const BASICO = { commitmentMonths: 1, baseMonthlyPrice: 99.99, userMonthlyPrice: 2.5, includedUnits: 10 };
const COMPLETO = { commitmentMonths: 1, baseMonthlyPrice: 199.99, userMonthlyPrice: 1.99, includedUnits: 20 };
const RS = { commitmentMonths: 1, baseMonthlyPrice: 99.99, userMonthlyPrice: 2.49, includedUnits: 50 };
const NOW = new Date('2026-10-15T15:00:00Z'); // 12h em Sao Paulo

describe('computePrice: mensal e excedente', () => {
  it('1. mensal dentro das unidades incluidas: so a base (9999)', () => {
    const r = computePrice({ plan: BASICO, units: 10, now: NOW });
    expect(r).toMatchObject({ baseNetCents: 9999, extraUnits: 0, extraCents: 0, couponCents: 0, cycleTotalCents: 9999, totalCents: 9999 });
  });
  it('2. abaixo do incluido (1 de 10) nao reduz a base', () => {
    expect(computePrice({ plan: BASICO, units: 1, now: NOW }).cycleTotalCents).toBe(9999);
  });
  it('3. excedente Basico: 12 unidades = 9999 + 2 x 250 = 10499', () => {
    const r = computePrice({ plan: BASICO, units: 12, now: NOW });
    expect(r.extraUnits).toBe(2);
    expect(r.extraCents).toBe(500);
    expect(r.cycleTotalCents).toBe(10499);
  });
  it('4. Completo: 25 unidades = 19999 + 5 x 199 = 20994', () => {
    expect(computePrice({ plan: COMPLETO, units: 25, now: NOW }).cycleTotalCents).toBe(20994);
  });
  it('5. R&S conta vagas: 60 vagas = 9999 + 10 x 249 = 12489', () => {
    expect(computePrice({ plan: RS, units: 60, now: NOW }).cycleTotalCents).toBe(12489);
  });
  it('6. preco legado (sem base): usa `price`; sem nada usa o padrao 24999 + 300 por unidade', () => {
    // sem unidades incluidas, a 1a unidade ja e excedente: 15000 + 300
    expect(computePrice({ plan: { price: 150 }, units: 1, now: NOW }).cycleTotalCents).toBe(15_300);
    const r = computePrice({ plan: {}, units: 3, now: NOW });
    expect(r.baseMonthlyCents).toBe(24_999);
    expect(r.cycleTotalCents).toBe(24_999 + 3 * 300);
  });
  it('7. meses 0/null contam como 1', () => {
    expect(computePrice({ plan: { ...BASICO, commitmentMonths: 0 }, units: 10, now: NOW }).commitmentMonths).toBe(1);
    expect(computePrice({ plan: { ...BASICO, commitmentMonths: null }, units: 10, now: NOW }).commitmentMonths).toBe(1);
  });
});

describe('computePrice: ciclos com desconto', () => {
  it('8. anual (tabela legada 10%): 9999 x 12 = 119988; desconto 11999 (119988 x 0,10 = 11998,8); base liquida 107989', () => {
    const r = computePrice({ plan: { ...BASICO, commitmentMonths: 12 }, units: 10, now: NOW });
    expect(r).toMatchObject({ baseGrossCents: 119_988, cycleDiscountCents: 11_999, baseNetCents: 107_989, cycleTotalCents: 107_989 });
  });
  it('9. trimestral 5%: 29997 - 1500 = 28497 (29997 x 0,95 = 28497,15)', () => {
    expect(computePrice({ plan: { ...BASICO, commitmentMonths: 3 }, units: 10, now: NOW }).baseNetCents).toBe(28_497);
  });
  it('10. semestral 8%: 59994 x 0,92 = 55194,48 -> 55194', () => {
    expect(computePrice({ plan: { ...BASICO, commitmentMonths: 6 }, units: 10, now: NOW }).baseNetCents).toBe(55_194);
  });
  it('11. desconto do plano (15%) vale mais que a tabela legada: 119988 x 0,85 = 101989,8 -> 101990', () => {
    const r = computePrice({ plan: { ...BASICO, commitmentMonths: 12, discountPercent: 15 }, units: 10, now: NOW });
    expect(r.cycleDiscountBps).toBe(1500);
    expect(r.baseNetCents).toBe(101_990);
  });
  it('12. o excedente nao recebe desconto de ciclo: anual 12 unidades = 107989 + 2 x 250 x 12 = 113989', () => {
    const r = computePrice({ plan: { ...BASICO, commitmentMonths: 12 }, units: 12, now: NOW });
    expect(r.extraCents).toBe(6000);
    expect(r.cycleTotalCents).toBe(113_989);
  });
  it('13. ciclo invalido (2 meses) e quantidade invalida sao recusados', () => {
    expect(() => computePrice({ plan: { ...BASICO, commitmentMonths: 2 }, units: 1 })).toThrow(PricingError);
    expect(() => computePrice({ plan: BASICO, units: 0 })).toThrow(PricingError);
    expect(() => computePrice({ plan: BASICO, units: 1.5 })).toThrow(PricingError);
  });
});

describe('computePrice: cupom', () => {
  const plan = BASICO;
  it('14. percentual 10% sobre 10499: round(1049,9) = 1050; total 9449', () => {
    const r = computePrice({ plan, units: 12, coupon: { type: 'PERCENT', value: 10 }, now: NOW });
    expect(r).toMatchObject({ subtotalCents: 10_499, couponCents: 1050, cycleTotalCents: 9449, couponState: 'APPLIED' });
  });
  it('15. valor fixo e mensal x meses: R$ 20 no anual = 2000 x 12 = 24000; 113989 - 24000 = 89989', () => {
    const r = computePrice({ plan: { ...plan, commitmentMonths: 12 }, units: 12, coupon: { type: 'FIXED', value: 20 }, now: NOW });
    expect(r.couponCents).toBe(24_000);
    expect(r.cycleTotalCents).toBe(89_989);
  });
  it('16. valor fixo maior que o total fica limitado ao total (nunca negativo)', () => {
    const r = computePrice({ plan, units: 10, coupon: { type: 'FIXED', value: 500 }, now: NOW });
    expect(r.couponCents).toBe(9999);
    expect(r.cycleTotalCents).toBe(0);
  });
  it('17. cupom 100% zera a fatura', () => {
    const r = computePrice({ plan, units: 12, coupon: { type: 'PERCENT', value: 100 }, now: NOW });
    expect(r).toMatchObject({ couponCents: 10_499, cycleTotalCents: 0, totalCents: 0, couponState: 'APPLIED' });
  });
  it('18. percentual acima de 100 e limitado a 100', () => {
    expect(computePrice({ plan, units: 10, coupon: { type: 'PERCENT', value: 250 }, now: NOW }).cycleTotalCents).toBe(0);
  });
  it('19. cupom vencido nao desconta (expirou ontem)', () => {
    const r = computePrice({ plan, units: 10, coupon: { type: 'PERCENT', value: 50, expiresAt: new Date('2026-10-14T23:59:59Z') }, now: NOW });
    expect(r).toMatchObject({ couponCents: 0, couponState: 'EXPIRED', cycleTotalCents: 9999 });
  });
  it('20. cupom valido ate amanha desconta; cupom que ainda nao comecou nao desconta', () => {
    const ok = computePrice({ plan, units: 10, coupon: { type: 'PERCENT', value: 50, expiresAt: new Date('2026-10-16T00:00:00Z') }, now: NOW });
    expect(ok).toMatchObject({ couponState: 'APPLIED', couponCents: 5000, cycleTotalCents: 4999 }); // 9999 x 0,5 = 4999,5 -> 5000
    const early = computePrice({ plan, units: 10, coupon: { type: 'PERCENT', value: 50, startsAt: new Date('2026-11-01T00:00:00Z') }, now: NOW });
    expect(early).toMatchObject({ couponState: 'NOT_STARTED', couponCents: 0 });
  });
  it('21. cupom com valor zero/texto/tipo de teste gratis e ignorado', () => {
    expect(computePrice({ plan, units: 10, coupon: { type: 'PERCENT', value: 0 }, now: NOW }).couponState).toBe('INVALID');
    expect(computePrice({ plan, units: 10, coupon: { type: 'PERCENT', value: 'abc' }, now: NOW }).couponCents).toBe(0);
    expect(computePrice({ plan, units: 10, coupon: { type: 'TRIAL_DAYS', value: 30 }, now: NOW }).couponState).toBe('INVALID');
  });
});

describe('computePrice: centavos', () => {
  it('22. toCents corrige ruido binario: 10.005 -> 1001, 0.1 + 0.2 -> 30, 19.99 -> 1999', () => {
    expect(toCents(10.005)).toBe(1001);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents('19.99')).toBe(1999);
    expect(toCents(null)).toBe(0);
  });
  it('23. Decimal do Prisma (objeto com toString/valueOf) funciona como numero', () => {
    const dec = (n: number) => ({ toString: () => String(n), valueOf: () => n });
    expect(computePrice({ plan: { baseMonthlyPrice: dec(99.99), userMonthlyPrice: dec(2.5), includedUnits: 10 }, units: 11, now: NOW }).cycleTotalCents).toBe(10_249);
  });
  it('24. todos os valores sao inteiros e total = base liquida + excedente - cupom', () => {
    for (const months of [1, 3, 6, 12]) for (const units of [1, 10, 11, 37]) for (const coupon of [null, { type: 'PERCENT', value: 33.33 }, { type: 'FIXED', value: 7.77 }]) {
      const r = computePrice({ plan: { ...BASICO, baseMonthlyPrice: 99.97, commitmentMonths: months }, units, coupon, now: NOW });
      for (const v of [r.baseGrossCents, r.cycleDiscountCents, r.baseNetCents, r.extraCents, r.couponCents, r.cycleTotalCents]) expect(Number.isInteger(v)).toBe(true);
      expect(r.cycleTotalCents).toBe(r.baseNetCents + r.extraCents - r.couponCents);
      expect(r.cycleTotalCents).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('computePrice: troca no meio do ciclo (proporcional por dia, America/Sao_Paulo)', () => {
  const periodStart = new Date('2026-10-01T03:00:00Z'); // 01/10 00:00 em SP
  const periodEnd = new Date('2026-11-01T03:00:00Z'); // 01/11 00:00 em SP: ciclo de 31 dias
  it('25. mais unidades no dia 16: 10 -> 15 unidades; diff 1250; 16 dias de 31 = 1250 x 16 / 31 = 645,16 -> 645', () => {
    const r = computePrice({ plan: BASICO, units: 15, proration: { previous: { plan: BASICO, units: 10 }, periodStart, periodEnd, changeAt: new Date('2026-10-16T15:00:00Z') }, now: NOW });
    expect(r.proration).toEqual({ previousCycleTotalCents: 9999, differenceCents: 1250, remainingDays: 16, cycleDays: 31, amountCents: 645 });
    expect(r.cycleTotalCents).toBe(11_249);
    expect(r.totalCents).toBe(645);
  });
  it('26. Basico -> Completo (12 unidades), ciclo de 30 dias, faltam 10: (19999 - 10499) x 10 / 30 = 3166,67 -> 3167', () => {
    const end = new Date('2026-10-31T03:00:00Z');
    const r = computePrice({ plan: COMPLETO, units: 12, proration: { previous: { plan: BASICO, units: 12 }, periodStart, periodEnd: end, changeAt: new Date('2026-10-21T15:00:00Z') } });
    expect(r.proration).toMatchObject({ differenceCents: 9500, remainingDays: 10, cycleDays: 30, amountCents: 3167 });
  });
  it('27. downgrade nao cobra nem credita: total proporcional 0', () => {
    const r = computePrice({ plan: BASICO, units: 10, proration: { previous: { plan: BASICO, units: 15 }, periodStart, periodEnd, changeAt: NOW } });
    expect(r.proration?.differenceCents).toBe(-1250);
    expect(r.totalCents).toBe(0);
  });
  it('28. fuso: 01:30Z do dia 16 ainda e dia 15 em Sao Paulo -> faltam 17 dias, nao 16', () => {
    const r = computePrice({ plan: BASICO, units: 15, proration: { previous: { plan: BASICO, units: 10 }, periodStart, periodEnd, changeAt: new Date('2026-10-16T01:30:00Z') } });
    expect(r.proration?.remainingDays).toBe(17);
    expect(r.proration?.amountCents).toBe(Math.round((1250 * 17) / 31)); // 685,48 -> 685
  });
  it('29. trocar no ultimo dia (ou depois do fim) nao cobra proporcional', () => {
    const last = computePrice({ plan: BASICO, units: 15, proration: { previous: { plan: BASICO, units: 10 }, periodStart, periodEnd, changeAt: new Date('2026-11-01T12:00:00Z') } });
    expect(last.proration).toMatchObject({ remainingDays: 0, amountCents: 0 });
    const after = computePrice({ plan: BASICO, units: 15, proration: { previous: { plan: BASICO, units: 10 }, periodStart, periodEnd, changeAt: new Date('2026-11-09T12:00:00Z') } });
    expect(after.totalCents).toBe(0);
  });
  it('30. sem inicio do ciclo assume 30 dias x meses; cupom entra nos dois totais', () => {
    // 10% nos dois lados: (10499 -> 9449) e (11249 -> 10124 [1124,9 -> 1125]) ; diff 675 ; 15 de 30 dias = 337,5 -> 338
    const coupon = { type: 'PERCENT', value: 10 };
    const r = computePrice({ plan: BASICO, units: 15, coupon, proration: { previous: { plan: BASICO, units: 12, coupon }, periodEnd: new Date('2026-10-31T03:00:00Z'), changeAt: new Date('2026-10-16T15:00:00Z') } });
    expect(r.proration).toMatchObject({ previousCycleTotalCents: 9449, differenceCents: 675, remainingDays: 15, cycleDays: 30, amountCents: 338 });
  });
  it('31. prorationDays e saoPauloDayNumber respeitam a virada do dia em SP (03:00Z)', () => {
    expect(saoPauloDayNumber(new Date('2026-10-16T02:59:59Z'))).toBe(saoPauloDayNumber(new Date('2026-10-15T12:00:00Z')));
    expect(saoPauloDayNumber(new Date('2026-10-16T03:00:00Z'))).toBe(saoPauloDayNumber(new Date('2026-10-15T12:00:00Z')) + 1);
    expect(prorationDays({ periodEnd: new Date('2026-10-31T03:00:00Z'), changeAt: new Date('2026-10-28T20:00:00Z') })).toEqual({ remainingDays: 3, cycleDays: 30 });
  });
});

describe('planPricingForSubscription: cliente antigo mantem a pricingVersion', () => {
  const plan = { ...BASICO, pricingVersion: '2026.2', discountPercent: 0 };
  it('32. assinatura em outra versao usa os precos guardados nela', () => {
    const sub = { pricingVersion: '2026.1', baseMonthlyPrice: 79.99, userMonthlyPrice: 2, discountPercent: 0 };
    const r = computePrice({ plan: planPricingForSubscription(plan, sub), units: 12, now: NOW });
    expect(r.cycleTotalCents).toBe(7999 + 2 * 200); // 8399, e nao 10499 do plano atual
  });
  it('33. mesma versao ou sem preco guardado usa o plano atual', () => {
    expect(planPricingForSubscription(plan, { pricingVersion: '2026.2', baseMonthlyPrice: 50 })).toBe(plan);
    expect(planPricingForSubscription(plan, { pricingVersion: '2026.1', baseMonthlyPrice: null })).toBe(plan);
    expect(planPricingForSubscription(plan, null)).toBe(plan);
  });
});
