import { PricingService } from './pricing.service';
import { checkCouponEligibility, couponDiscount, isHighDiscount, type CouponLike } from '../coupons/coupon-rules';

const pricing = new PricingService();
const premium = { baseMonthlyPrice: 199.99, userMonthlyPrice: 2, includedUnits: 10 };

const coupon = (over: Partial<CouponLike> = {}): CouponLike => ({
  id: 'c1', type: 'PERCENT', value: 20, trialDays: 0, durationCycles: null, allowedPlanIds: [], minSeats: null,
  isActive: true, startsAt: null, expiresAt: null, maxRedemptions: null, redemptionCount: 0, ...over,
});

describe('precos com cupom: valores conferidos a mao', () => {
  it('Premium com 20 usuarios: 199,99 + 10 extras x R$ 2 = 219,99', () => {
    expect(pricing.calculate(1, 20, premium).total).toBe(219.99);
  });

  it('20% de cupom sobre 219,99 = 175,99 (arredondado em centavos)', () => {
    const quote = pricing.calculate(1, 20, premium, { type: 'PERCENT', value: 20 });
    expect(quote.couponDiscount).toBe(44);
    expect(quote.total).toBe(175.99);
  });

  it('cupom fixo vale por mes e e multiplicado pelos meses do ciclo, sem passar do total', () => {
    expect(pricing.calculate(3, 10, premium, { type: 'FIXED', value: 10 }).couponDiscount).toBe(30);
    expect(pricing.calculate(1, 10, premium, { type: 'FIXED', value: 9999 }).total).toBe(0);
  });

  it('100% (ou mais) zera a cobranca e nunca fica negativa', () => {
    expect(pricing.calculate(1, 10, premium, { type: 'PERCENT', value: 100 }).total).toBe(0);
    expect(pricing.calculate(1, 10, premium, { type: 'PERCENT', value: 150 }).total).toBe(0);
  });

  it('cupom nunca aumenta o valor, para qualquer quantidade de usuarios e periodo', () => {
    for (const months of [1, 3, 6, 12] as const) {
      for (const seats of [1, 5, 10, 11, 25, 100]) {
        const semCupom = pricing.calculate(months, seats, premium).total;
        for (const c of [{ type: 'PERCENT' as const, value: 5 }, { type: 'PERCENT' as const, value: 50 }, { type: 'FIXED' as const, value: 7 }]) {
          const comCupom = pricing.calculate(months, seats, premium, c).total;
          expect(comCupom).toBeLessThanOrEqual(semCupom);
          expect(comCupom).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('compromisso mais longo nunca fica mais caro por mes que o mensal', () => {
    const perMonth = (months: 1 | 3 | 6 | 12) => pricing.calculate(months, 15, premium).total / months;
    expect(perMonth(3)).toBeLessThanOrEqual(perMonth(1));
    expect(perMonth(6)).toBeLessThanOrEqual(perMonth(3));
    expect(perMonth(12)).toBeLessThanOrEqual(perMonth(6));
  });

  it('cupom com valor invalido (zero, negativo, texto) e ignorado', () => {
    expect(couponDiscount({ type: 'PERCENT', value: 0 })).toBeNull();
    expect(couponDiscount({ type: 'PERCENT', value: -5 })).toBeNull();
    expect(couponDiscount({ type: 'FIXED', value: 'abc' })).toBeNull();
    expect(couponDiscount({ type: 'TRIAL_DAYS', value: 30 })).toBeNull();
    expect(couponDiscount({ type: 'PERCENT', value: '15' })).toEqual({ type: 'PERCENT', value: 15 });
  });
});

describe('elegibilidade do cupom', () => {
  const now = new Date('2026-10-10T12:00:00Z');
  const ok = (c: CouponLike, ctx = {}) => checkCouponEligibility(c, { now, ...ctx });

  it('cupom valido passa; ausente ou inativo nao', () => {
    expect(ok(coupon()).ok).toBe(true);
    expect(checkCouponEligibility(null, { now }).ok).toBe(false);
    expect(ok(coupon({ isActive: false })).ok).toBe(false);
  });

  it('respeita inicio, validade e limite de usos (o ultimo uso ainda vale, o seguinte nao)', () => {
    expect(ok(coupon({ startsAt: new Date('2026-11-01') }))).toMatchObject({ ok: false, code: 'COUPON_NOT_STARTED' });
    expect(ok(coupon({ expiresAt: new Date('2026-10-01') }))).toMatchObject({ ok: false, code: 'COUPON_EXPIRED' });
    expect(ok(coupon({ maxRedemptions: 5, redemptionCount: 4 })).ok).toBe(true);
    expect(ok(coupon({ maxRedemptions: 5, redemptionCount: 5 }))).toMatchObject({ ok: false, code: 'COUPON_LIMIT_REACHED' });
  });

  it('respeita plano permitido e minimo de usuarios', () => {
    expect(ok(coupon({ allowedPlanIds: ['premium'] }), { planId: 'basico' })).toMatchObject({ ok: false, code: 'COUPON_PLAN_NOT_ALLOWED' });
    expect(ok(coupon({ allowedPlanIds: ['premium'] }), { planId: 'premium' }).ok).toBe(true);
    expect(ok(coupon({ minSeats: 10 }), { seats: 9 })).toMatchObject({ ok: false, code: 'COUPON_MIN_SEATS' });
    expect(ok(coupon({ minSeats: 10 }), { seats: 10 }).ok).toBe(true);
  });

  it('desconto alto exige DEV/CEO: acima de 20% ou R$ 100 por mes', () => {
    expect(isHighDiscount('PERCENT', 20)).toBe(false);
    expect(isHighDiscount('PERCENT', 21)).toBe(true);
    expect(isHighDiscount('FIXED', 100)).toBe(false);
    expect(isHighDiscount('FIXED', 101)).toBe(true);
  });
});
