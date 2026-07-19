import { PricingService } from './pricing.service';
import { BadRequestException } from '@nestjs/common';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService();
  });

  it('should validate invalid inputs', () => {
    expect(() => service.calculate(1, 0)).toThrow(BadRequestException);
    expect(() => service.calculate(1, -5)).toThrow(BadRequestException);
    expect(() => service.calculate(1, 1.5)).toThrow(BadRequestException);
    // @ts-ignore
    expect(() => service.calculate(2, 10)).toThrow(BadRequestException);
  });

  it('should calculate 1 month correctly (0% discount)', () => {
    // 1 user
    let res = service.calculate(1, 1);
    expect(res.baseGross).toBe(249.99);
    expect(res.baseDiscount).toBe(0);
    expect(res.baseNet).toBe(249.99);
    expect(res.seatAmount).toBe(3.00);
    expect(res.total).toBe(252.99);

    // 50 users
    res = service.calculate(1, 50);
    expect(res.total).toBe(399.99); // 249.99 + (50 * 3) = 249.99 + 150 = 399.99
  });

  it('should calculate 3 months correctly (5% discount)', () => {
    // 1 user
    let res = service.calculate(3, 1);
    expect(res.baseGross).toBe(749.97);
    expect(res.baseDiscount).toBe(37.50);
    expect(res.baseNet).toBe(712.47);
    expect(res.seatAmount).toBe(9.00);
    expect(res.total).toBe(721.47); // 712.47 + 9.00

    // 10 users
    res = service.calculate(3, 10);
    expect(res.seatAmount).toBe(90.00);
    expect(res.total).toBe(802.47); // 712.47 + 90.00 = 802.47

    // 50 users
    res = service.calculate(3, 50);
    expect(res.total).toBe(1162.47); // 712.47 + 450 = 1162.47
  });

  it('should calculate 6 months correctly (8% discount)', () => {
    // 1 user
    let res = service.calculate(6, 1);
    expect(res.baseGross).toBe(1499.94);
    expect(res.baseDiscount).toBe(120.00);
    expect(res.baseNet).toBe(1379.94);
    expect(res.seatAmount).toBe(18.00);
    expect(res.total).toBe(1397.94);

    // 10 users
    res = service.calculate(6, 10);
    expect(res.total).toBe(1559.94); // 1379.94 + 180 = 1559.94

    // 50 users
    res = service.calculate(6, 50);
    expect(res.total).toBe(2279.94); // 1379.94 + 900 = 2279.94
  });

  it('should calculate 12 months correctly (10% discount)', () => {
    // 1 user
    let res = service.calculate(12, 1);
    expect(res.baseGross).toBe(2999.88);
    expect(res.baseDiscount).toBe(299.99); // 2999.88 * 0.1 = 299.988 => round(299.99) ? Wait, baseNet is Math.round(2999.88 * 0.9) = Math.round(2699.892) = 2699.89. baseDiscount = 2999.88 - 2699.89 = 299.99.
    expect(res.baseNet).toBe(2699.89);
    expect(res.seatAmount).toBe(36.00);
    expect(res.total).toBe(2735.89);

    // 5 users
    res = service.calculate(12, 5);
    expect(res.total).toBe(2879.89); // 2699.89 + 180 = 2879.89

    // 10 users
    res = service.calculate(12, 10);
    expect(res.total).toBe(3059.89); // 2699.89 + 360 = 3059.89

    // 50 users
    res = service.calculate(12, 50);
    expect(res.total).toBe(4499.89); // 2699.89 + 1800 = 4499.89
  });
});
