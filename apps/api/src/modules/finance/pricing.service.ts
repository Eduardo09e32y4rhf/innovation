import { BadRequestException, Injectable } from '@nestjs/common';

export type CommitmentMonths = 1 | 3 | 6 | 12;

/** Desconto de cupom: PERCENT = % sobre o total do ciclo; FIXED = R$ por mes, multiplicado pelos meses do ciclo. */
export interface CouponDiscountInput {
  type: 'PERCENT' | 'FIXED';
  value: number;
}

const BASE_MONTHLY_CENTS = 24_999;
const USER_MONTHLY_CENTS = 300;

const DISCOUNT_BPS: Record<CommitmentMonths, number> = {
  1: 0,
  3: 500,
  6: 800,
  12: 1000,
};

@Injectable()
export class PricingService {
  calculate(
    commitmentMonths: any = 1,
    seatQuantity: number = 1,
    customPricing?: {
      baseMonthlyPrice?: number | string | any;
      userMonthlyPrice?: number | string | any;
      price?: number | string | any;
    },
    coupon?: CouponDiscountInput | null,
  ) {
    if (!Number.isFinite(seatQuantity) || seatQuantity < 1 || !Number.isInteger(seatQuantity)) {
      throw new BadRequestException('A quantidade de usuários deve ser maior que zero.');
    }

    let normalizedMonths: CommitmentMonths = 1;
    if (commitmentMonths !== null && commitmentMonths !== undefined && commitmentMonths !== 0 && commitmentMonths !== '') {
      if (![1, 3, 6, 12].includes(Number(commitmentMonths))) {
        throw new BadRequestException('Período de contratação inválido.');
      }
      normalizedMonths = Number(commitmentMonths) as CommitmentMonths;
    }

    const discountBps = DISCOUNT_BPS[normalizedMonths] ?? 0;

    let baseMonthlyCents = BASE_MONTHLY_CENTS;
    if (customPricing) {
      const p = Number(customPricing.baseMonthlyPrice || customPricing.price || 0);
      if (p > 0 && !isNaN(p)) baseMonthlyCents = Math.round(p * 100);
    }

    let userMonthlyCents = USER_MONTHLY_CENTS;
    if (customPricing) {
      const u = Number(customPricing.userMonthlyPrice || 0);
      if (u > 0 && !isNaN(u)) userMonthlyCents = Math.round(u * 100);
    }

    const baseGrossCents = baseMonthlyCents * normalizedMonths;
    const baseNetCents = Math.round(baseGrossCents * (10_000 - discountBps) / 10_000);
    const baseDiscountCents = baseGrossCents - baseNetCents;
    const seatAmountCents = userMonthlyCents * seatQuantity * normalizedMonths;
    const totalBeforeCouponCents = baseNetCents + seatAmountCents;
    const couponDiscountCents = this.couponDiscountCents(totalBeforeCouponCents, normalizedMonths, coupon);
    const totalCents = totalBeforeCouponCents - couponDiscountCents;

    return {
      commitmentMonths: normalizedMonths,
      seatQuantity,

      baseMonthlyCents,
      userMonthlyCents,

      discountBps,
      discountPercent: discountBps / 100,

      baseGrossCents,
      baseDiscountCents,
      baseNetCents,
      seatAmountCents,
      totalBeforeCouponCents,
      couponDiscountCents,
      totalCents,

      baseGross: baseGrossCents / 100,
      baseDiscount: baseDiscountCents / 100,
      baseNet: baseNetCents / 100,
      seatAmount: seatAmountCents / 100,
      couponDiscount: couponDiscountCents / 100,
      total: totalCents / 100,
    };
  }

  private couponDiscountCents(totalCents: number, months: number, coupon?: CouponDiscountInput | null) {
    if (!coupon || !Number.isFinite(coupon.value) || coupon.value <= 0) return 0;
    const raw = coupon.type === 'PERCENT'
      ? Math.round(totalCents * Math.min(coupon.value, 100) / 100)
      : Math.round(coupon.value * 100) * months;
    return Math.max(0, Math.min(totalCents, raw));
  }
}
