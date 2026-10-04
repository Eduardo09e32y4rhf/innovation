export type CouponType = 'TRIAL_DAYS' | 'PERCENT' | 'FIXED';

export interface CouponLike {
  id: string;
  type: string;
  value: unknown;
  trialDays: number;
  durationCycles: number | null;
  allowedPlanIds: string[];
  minSeats: number | null;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxRedemptions: number | null;
  redemptionCount: number;
}

export type CouponCheck = { ok: true } | { ok: false; code: string; message: string };

/** Regras de elegibilidade do cupom — única fonte de verdade (cotação, cadastro e resgate). */
export function checkCouponEligibility(coupon: CouponLike | null | undefined, ctx: { planId?: string; seats?: number; now?: Date }): CouponCheck {
  const now = ctx.now ?? new Date();
  const invalid = (code: string, message: string): CouponCheck => ({ ok: false, code, message });
  if (!coupon || !coupon.isActive) return invalid('COUPON_INVALID', 'Cupom invalido, expirado ou indisponivel.');
  if (coupon.startsAt && coupon.startsAt > now) return invalid('COUPON_NOT_STARTED', 'Este cupom ainda nao esta valido.');
  if (coupon.expiresAt && coupon.expiresAt < now) return invalid('COUPON_EXPIRED', 'Este cupom expirou.');
  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) return invalid('COUPON_LIMIT_REACHED', 'Este cupom atingiu o limite de usos.');
  if (ctx.planId && coupon.allowedPlanIds.length > 0 && !coupon.allowedPlanIds.includes(ctx.planId)) return invalid('COUPON_PLAN_NOT_ALLOWED', 'Este cupom nao vale para o plano escolhido.');
  if (ctx.seats !== undefined && coupon.minSeats && ctx.seats < coupon.minSeats) return invalid('COUPON_MIN_SEATS', `Este cupom exige no minimo ${coupon.minSeats} usuarios.`);
  return { ok: true };
}

/** Desconto monetário do cupom (null quando for apenas teste grátis). */
export function couponDiscount(coupon: Pick<CouponLike, 'type' | 'value'>): { type: 'PERCENT' | 'FIXED'; value: number } | null {
  if (coupon.type !== 'PERCENT' && coupon.type !== 'FIXED') return null;
  const value = Number(coupon.value);
  return Number.isFinite(value) && value > 0 ? { type: coupon.type, value } : null;
}

/** Acima deste percentual (ou valor fixo mensal), só DEV/CEO podem criar o cupom. */
export const HIGH_DISCOUNT_PERCENT = 20;
export const HIGH_DISCOUNT_FIXED = 100;

export function isHighDiscount(type: string, value: number) {
  return (type === 'PERCENT' && value > HIGH_DISCOUNT_PERCENT) || (type === 'FIXED' && value > HIGH_DISCOUNT_FIXED);
}
