import { PricingService } from '../finance/pricing.service';
import { checkCouponEligibility, couponDiscount, isHighDiscount, type CouponLike } from './coupon-rules';

const base: CouponLike = {
  id: 'c1', type: 'PERCENT', value: 20, trialDays: 0, durationCycles: 3, allowedPlanIds: [], minSeats: null,
  isActive: true, startsAt: null, expiresAt: null, maxRedemptions: null, redemptionCount: 0,
};

describe('checkCouponEligibility', () => {
  it('aceita cupom válido', () => expect(checkCouponEligibility(base, { planId: 'p1', seats: 5 })).toEqual({ ok: true }));
  it('rejeita inativo, inexistente, vencido e ainda não iniciado', () => {
    expect(checkCouponEligibility({ ...base, isActive: false }, {})).toMatchObject({ ok: false, code: 'COUPON_INVALID' });
    expect(checkCouponEligibility(null, {})).toMatchObject({ ok: false });
    expect(checkCouponEligibility({ ...base, expiresAt: new Date('2020-01-01') }, {})).toMatchObject({ code: 'COUPON_EXPIRED' });
    expect(checkCouponEligibility({ ...base, startsAt: new Date('2999-01-01') }, {})).toMatchObject({ code: 'COUPON_NOT_STARTED' });
  });
  it('respeita limite de usos, plano permitido e mínimo de licenças', () => {
    expect(checkCouponEligibility({ ...base, maxRedemptions: 2, redemptionCount: 2 }, {})).toMatchObject({ code: 'COUPON_LIMIT_REACHED' });
    expect(checkCouponEligibility({ ...base, allowedPlanIds: ['p2'] }, { planId: 'p1' })).toMatchObject({ code: 'COUPON_PLAN_NOT_ALLOWED' });
    expect(checkCouponEligibility({ ...base, allowedPlanIds: ['p1'] }, { planId: 'p1' })).toEqual({ ok: true });
    expect(checkCouponEligibility({ ...base, minSeats: 10 }, { seats: 5 })).toMatchObject({ code: 'COUPON_MIN_SEATS' });
  });
});

describe('couponDiscount / isHighDiscount', () => {
  it('só desconto monetário vira desconto', () => {
    expect(couponDiscount({ type: 'TRIAL_DAYS', value: null })).toBeNull();
    expect(couponDiscount({ type: 'PERCENT', value: '15.00' })).toEqual({ type: 'PERCENT', value: 15 });
    expect(couponDiscount({ type: 'FIXED', value: 0 })).toBeNull();
  });
  it('marca descontos altos', () => {
    expect(isHighDiscount('PERCENT', 20)).toBe(false);
    expect(isHighDiscount('PERCENT', 21)).toBe(true);
    expect(isHighDiscount('FIXED', 101)).toBe(true);
    expect(isHighDiscount('TRIAL_DAYS', 999)).toBe(false);
  });
});

describe('PricingService com cupom', () => {
  const pricing = new PricingService();
  const plan = { baseMonthlyPrice: 100, userMonthlyPrice: 10 };

  it('sem cupom mantém o total', () => {
    expect(pricing.calculate(1, 5, plan).total).toBe(150);
  });
  it('percentual incide sobre o total do ciclo', () => {
    const quote = pricing.calculate(1, 5, plan, { type: 'PERCENT', value: 20 });
    expect(quote.totalBeforeCouponCents).toBe(15000);
    expect(quote.couponDiscountCents).toBe(3000);
    expect(quote.total).toBe(120);
  });
  it('valor fixo é por mês e multiplica pelos meses do ciclo', () => {
    const quote = pricing.calculate(3, 1, plan, { type: 'FIXED', value: 10 });
    expect(quote.couponDiscountCents).toBe(3000);
    expect(quote.totalCents).toBe(quote.totalBeforeCouponCents - 3000);
  });
  it('nunca deixa o total negativo', () => {
    expect(pricing.calculate(1, 1, plan, { type: 'FIXED', value: 5000 }).total).toBe(0);
    expect(pricing.calculate(1, 1, plan, { type: 'PERCENT', value: 150 }).total).toBe(0);
  });
});
