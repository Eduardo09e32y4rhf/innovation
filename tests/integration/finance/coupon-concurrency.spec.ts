import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../apps/api/src/database/prisma.service';
import { AuthRepository } from '../../../apps/api/src/modules/auth/auth.repository';

// Roda contra Postgres real (CI: job "integration"). Garante que o limite de usos do cupom nunca e ultrapassado.
describe('Cupom: resgate simultaneo', () => {
  const prisma = new PrismaService();
  const repo = new AuthRepository(prisma);
  const tag = randomUUID().slice(0, 8);
  let planId: string;
  const createdCompanies: string[] = [];
  const createdCoupons: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();
    const plan = await prisma.platformPlan.create({ data: { name: `plan-${tag}`, price: 100 } });
    planId = plan.id;
  });

  afterAll(async () => {
    await prisma.couponRedemption.deleteMany({ where: { couponId: { in: createdCoupons } } });
    await prisma.companySubscription.deleteMany({ where: { companyId: { in: createdCompanies } } });
    await prisma.promotionCoupon.deleteMany({ where: { id: { in: createdCoupons } } });
    await prisma.company.deleteMany({ where: { id: { in: createdCompanies } } });
    await prisma.platformPlan.delete({ where: { id: planId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  async function newCoupon(maxRedemptions: number | null, type = 'PERCENT') {
    const c = await prisma.promotionCoupon.create({
      data: { code: `C${tag}${createdCoupons.length}`, type, value: 10, maxRedemptions, isActive: true } as any,
    });
    createdCoupons.push(c.id);
    return c;
  }
  async function newCompany() {
    const co = await prisma.company.create({ data: { name: `co-${tag}-${createdCompanies.length}` } });
    createdCompanies.push(co.id);
    return co;
  }

  // Transacoes Serializable podem abortar o perdedor com erro de serializacao: isso tambem conta como "nao resgatou".
  const settle = (ps: Promise<any>[]) => Promise.all(ps.map((p) => p.then((r) => r?.applied === true, () => false)));

  it('10 resgates simultaneos de cupom com limite 3 resultam em no maximo 3 usos', async () => {
    const coupon = await newCoupon(3);
    const companies = await Promise.all(Array.from({ length: 10 }, newCompany));
    const results = await settle(
      companies.map((co, i) =>
        repo.redeemDiscountCoupon({ companyId: co.id, couponId: coupon.id, documentHash: `${tag}-limit-${i}`, planId, seatQuantity: 5, status: 'TRIAL' }),
      ),
    );
    const applied = results.filter(Boolean).length;
    const stored = await prisma.promotionCoupon.findUniqueOrThrow({ where: { id: coupon.id } });
    const redemptions = await prisma.couponRedemption.count({ where: { couponId: coupon.id } });
    expect(applied).toBeLessThanOrEqual(3);
    expect(applied).toBeGreaterThan(0);
    expect(stored.redemptionCount).toBe(applied);
    expect(redemptions).toBe(applied);
  });

  it('o mesmo documento nao resgata o mesmo cupom duas vezes ao mesmo tempo', async () => {
    const coupon = await newCoupon(null);
    const companies = await Promise.all(Array.from({ length: 5 }, newCompany));
    const results = await settle(
      companies.map((co) => repo.redeemDiscountCoupon({ companyId: co.id, couponId: coupon.id, documentHash: `${tag}-same-doc`, planId, seatQuantity: 5, status: 'TRIAL' })),
    );
    expect(results.filter(Boolean).length).toBe(1);
    expect(await prisma.couponRedemption.count({ where: { couponId: coupon.id } })).toBe(1);
  });

  it('cupom de trial tambem respeita o limite sob concorrencia', async () => {
    const coupon = await newCoupon(2, 'TRIAL_DAYS');
    const companies = await Promise.all(Array.from({ length: 8 }, newCompany));
    const results = await settle(
      companies.map((co, i) => repo.redeemTrialCoupon({ companyId: co.id, couponId: coupon.id, documentHash: `${tag}-trial-${i}`, trialDays: 30, planId, seatQuantity: 5 })),
    );
    const applied = results.filter(Boolean).length;
    expect(applied).toBeLessThanOrEqual(2);
    expect((await prisma.promotionCoupon.findUniqueOrThrow({ where: { id: coupon.id } })).redemptionCount).toBe(applied);
  });
});