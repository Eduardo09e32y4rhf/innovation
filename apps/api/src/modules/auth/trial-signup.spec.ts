import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { resolveTrialDays, trialDaysDefault } from '../finance/trial-lifecycle';

const plan = (extra: any = {}) => ({ id: 'p1', name: 'Basico', isFree: false, maxUsers: 100, maxEmployees: 50, commitmentMonths: 1, baseMonthlyPrice: 99.99, userMonthlyPrice: 2.5, price: 99.99, includedUnits: 10, discountPercent: 0, pricingVersion: '2026.2', activeModules: [], ...extra });
const coupon = (extra: any = {}) => ({ id: 'k1', code: 'X', type: 'TRIAL_DAYS', value: null, trialDays: 10, durationCycles: null, allowedPlanIds: [], minSeats: null, isActive: true, startsAt: null, expiresAt: null, maxRedemptions: null, redemptionCount: 0, ...extra });
const END = new Date('2026-11-21T12:00:00Z');

function setup(opts: { plan?: any; coupon?: any; used?: boolean } = {}) {
  const repo: any = {
    findUserByEmail: vi.fn(async () => null),
    findCompanyByDocument: vi.fn(async () => null),
    findPublicPlan: vi.fn(async () => opts.plan ?? plan()),
    findCouponByCode: vi.fn(async () => opts.coupon ?? null),
    createCompanyWithAdmin: vi.fn(async () => ({ id: 'c1', status: 'SUSPENDED', billingStatus: 'PENDING_PAYMENT', users: [{ id: 'u1', email: 'a@a.com', name: 'A', companyId: 'c1', role: 'ADMIN' }] })),
    createSubscription: vi.fn(async () => ({})),
    startDefaultTrial: vi.fn(async () => (opts.used ? { applied: false, reason: 'TRIAL_ALREADY_USED' } : { applied: true, trialEndsAt: END })),
    redeemTrialCoupon: vi.fn(async () => ({ applied: true, trialEndsAt: END })),
    redeemDiscountCoupon: vi.fn(async () => ({ applied: true })),
    deleteIncompleteCompany: vi.fn(async () => ({})),
  };
  const finance: any = { ensureCompanyOnboardingBilling: vi.fn(async () => ({ active: false, paymentUrl: 'https://pay' })) };
  const service: any = new AuthService(repo, {} as any, {} as any, finance, { calculate: vi.fn(() => ({ total: 1 })) } as any, {} as any, {} as any, {} as any, {} as any);
  service.assertValidDocument = () => undefined;
  service.assertStrongPassword = () => undefined;
  service.buildAuthResponse = vi.fn(async () => ({ access_token: 't' }));
  service.sendVerificationEmail = vi.fn(async () => undefined);
  service.documentHash = (d: string) => `h:${d}`;
  const register = (extra: any = {}) => service.registerCompany({ companyName: 'Acme', document: '11222333000181', name: 'A', email: 'a@a.com', password: 'x', planId: 'p1', seatQuantity: 12, ...extra });
  return { service, repo, finance, register };
}

describe('cadastro com teste gratis padrao', () => {
  it('sem cupom: ganha 30 dias, sem cobranca nem checkout', async () => {
    const { repo, finance, register } = setup();
    const r = await register();
    expect(r).toMatchObject({ trial: true, trialEndsAt: END, trialAlreadyUsed: false });
    expect(repo.startDefaultTrial).toHaveBeenCalledWith(expect.objectContaining({ trialDays: 30, documentHash: 'h:11222333000181' }));
    expect(finance.ensureCompanyOnboardingBilling).not.toHaveBeenCalled();
    expect(repo.createSubscription).not.toHaveBeenCalled();
    expect(r.paymentUrl).toBeNull();
  });
  it('2o cadastro com o mesmo documento nao ganha teste: paga na hora, com mensagem', async () => {
    const { repo, finance, register } = setup({ used: true });
    const r = await register();
    expect(r).toMatchObject({ trial: false, trialAlreadyUsed: true, paymentUrl: 'https://pay' });
    expect(r.trialMessage).toMatch(/ja usou o teste/);
    expect(repo.createSubscription).toHaveBeenCalled();
    expect(finance.ensureCompanyOnboardingBilling).toHaveBeenCalled();
  });
  it('plano gratis nao tem teste', async () => {
    const { repo, register } = setup({ plan: plan({ isFree: true }) });
    const r = await register();
    expect(r.trial).toBe(false);
    expect(repo.startDefaultTrial).not.toHaveBeenCalled();
    expect(repo.createSubscription).toHaveBeenCalled();
  });
  it('cupom PERCENT nao altera o teste: guardado para depois (passado ao teste, sem desconto nele)', async () => {
    const { repo, register } = setup({ coupon: coupon({ type: 'PERCENT', value: 20 }) });
    const r = await register({ couponCode: 'X' });
    expect(r.trial).toBe(true);
    expect(repo.startDefaultTrial).toHaveBeenCalledWith(expect.objectContaining({ trialDays: 30, discountCouponId: 'k1' }));
    expect(repo.redeemDiscountCoupon).not.toHaveBeenCalled();
  });
  it('cupom TRIAL_DAYS menor que 30 nao reduz o teste', async () => {
    const { repo, register } = setup({ coupon: coupon({ trialDays: 10 }) });
    await register({ couponCode: 'X' });
    expect(repo.redeemTrialCoupon).not.toHaveBeenCalled();
    expect(repo.startDefaultTrial).toHaveBeenCalledWith(expect.objectContaining({ trialDays: 30 }));
  });
  it('cupom TRIAL_DAYS maior que 30 define o total de dias', async () => {
    const { repo, register } = setup({ coupon: coupon({ trialDays: 45 }) });
    await register({ couponCode: 'X' });
    expect(repo.redeemTrialCoupon).toHaveBeenCalledWith(expect.objectContaining({ trialDays: 45 }));
  });
  it('cotacao publica devolve trialDays 30 sem cupom e 0 no plano gratis', async () => {
    expect((await setup().service.quotePublicPlan({ planId: 'p1', seatQuantity: 5 })).trialDays).toBe(30);
    expect((await setup({ plan: plan({ isFree: true }) }).service.quotePublicPlan({ planId: 'p1', seatQuantity: 5 })).trialDays).toBe(0);
  });
});

describe('TRIAL_DAYS_DEFAULT', () => {
  it('padrao 30, respeita a env e ignora valores invalidos', () => {
    expect(trialDaysDefault({})).toBe(30);
    expect(trialDaysDefault({ TRIAL_DAYS_DEFAULT: '14' })).toBe(14);
    expect(trialDaysDefault({ TRIAL_DAYS_DEFAULT: 'abc' })).toBe(30);
    expect(trialDaysDefault({ TRIAL_DAYS_DEFAULT: '0' })).toBe(30);
    expect(resolveTrialDays(10, { TRIAL_DAYS_DEFAULT: '14' })).toBe(14);
    expect(resolveTrialDays(20, { TRIAL_DAYS_DEFAULT: '14' })).toBe(20);
  });
});
