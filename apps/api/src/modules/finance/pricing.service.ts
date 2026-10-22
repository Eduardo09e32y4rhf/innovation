import { BadRequestException, Injectable } from '@nestjs/common';
import { CommitmentMonths, computePrice, PricingError } from './pricing';

export type { CommitmentMonths };

/** Desconto de cupom: PERCENT = % sobre o total do ciclo; FIXED = R$ por mes, multiplicado pelos meses do ciclo. */
export interface CouponDiscountInput {
  type: 'PERCENT' | 'FIXED';
  value: number;
  startsAt?: Date | null;
  expiresAt?: Date | null;
}

/** Adaptador em reais sobre `computePrice` (pricing.ts), a unica fonte de calculo de preco. */
@Injectable()
export class PricingService {
  calculate(
    commitmentMonths: any = 1,
    seatQuantity: number = 1,
    customPricing?: {
      baseMonthlyPrice?: number | string | any;
      userMonthlyPrice?: number | string | any;
      price?: number | string | any;
      /** Usuarios (ou vagas, no plano R&S) cobertos pela base; so o que passar disso paga o adicional. */
      includedUnits?: number | string | any;
      discountPercent?: number | string | any;
    },
    coupon?: CouponDiscountInput | null,
    now?: Date,
  ) {
    let r;
    try {
      r = computePrice({ plan: { ...customPricing, commitmentMonths }, units: seatQuantity, coupon, now });
    } catch (error) {
      if (error instanceof PricingError) throw new BadRequestException(error.message);
      throw error;
    }
    return {
      commitmentMonths: r.commitmentMonths,
      seatQuantity: r.units,
      includedUnits: r.includedUnits,
      extraSeats: r.extraUnits,
      baseMonthlyCents: r.baseMonthlyCents,
      userMonthlyCents: r.unitMonthlyCents,
      discountBps: r.cycleDiscountBps,
      discountPercent: r.cycleDiscountBps / 100,
      baseGrossCents: r.baseGrossCents,
      baseDiscountCents: r.cycleDiscountCents,
      baseNetCents: r.baseNetCents,
      seatAmountCents: r.extraCents,
      totalBeforeCouponCents: r.subtotalCents,
      couponDiscountCents: r.couponCents,
      totalCents: r.cycleTotalCents,
      couponState: r.couponState,
      baseGross: r.baseGrossCents / 100,
      baseDiscount: r.cycleDiscountCents / 100,
      baseNet: r.baseNetCents / 100,
      seatAmount: r.extraCents / 100,
      couponDiscount: r.couponCents / 100,
      total: r.cycleTotalCents / 100,
    };
  }
}
