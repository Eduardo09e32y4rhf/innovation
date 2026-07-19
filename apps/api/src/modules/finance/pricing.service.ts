import { BadRequestException, Injectable } from '@nestjs/common';

export type CommitmentMonths = 1 | 3 | 6 | 12;

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
  calculate(commitmentMonths: CommitmentMonths, seatQuantity: number) {
    if (!Number.isInteger(seatQuantity) || seatQuantity < 1) {
      throw new BadRequestException('A quantidade de usuários deve ser maior que zero.');
    }

    const discountBps = DISCOUNT_BPS[commitmentMonths];

    if (discountBps === undefined) {
      throw new BadRequestException('Período de contratação inválido.');
    }

    const baseGrossCents = BASE_MONTHLY_CENTS * commitmentMonths;
    const baseNetCents = Math.round(baseGrossCents * (10_000 - discountBps) / 10_000);
    const baseDiscountCents = baseGrossCents - baseNetCents;
    const seatAmountCents = USER_MONTHLY_CENTS * seatQuantity * commitmentMonths;
    const totalCents = baseNetCents + seatAmountCents;

    return {
      commitmentMonths,
      seatQuantity,

      baseMonthlyCents: BASE_MONTHLY_CENTS,
      userMonthlyCents: USER_MONTHLY_CENTS,

      discountBps,
      discountPercent: discountBps / 100,

      baseGrossCents,
      baseDiscountCents,
      baseNetCents,
      seatAmountCents,
      totalCents,

      baseGross: baseGrossCents / 100,
      baseDiscount: baseDiscountCents / 100,
      baseNet: baseNetCents / 100,
      seatAmount: seatAmountCents / 100,
      total: totalCents / 100,
    };
  }
}
