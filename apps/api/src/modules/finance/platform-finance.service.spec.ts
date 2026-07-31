import { PlatformFinanceService } from './platform-finance.service';

function decimal(value: number) {
  return { toString: () => String(value), valueOf: () => value };
}

function createService() {
  const prisma = {
    platformInvoice: { findMany: vi.fn() },
    companySubscription: { findMany: vi.fn() },
    company: { findMany: vi.fn(), findUnique: vi.fn() },
    manualContract: { findMany: vi.fn() },
  };
  const pricingService = { calculate: vi.fn() };
  const service = new PlatformFinanceService(prisma as any, {} as any, pricingService as any);
  return { prisma, pricingService, service };
}

function configureQueries(
  prisma: ReturnType<typeof createService>['prisma'],
  data: {
    invoices?: any[];
    subscriptions?: any[];
    companies?: any[];
    contracts?: any[];
  } = {},
) {
  prisma.platformInvoice.findMany.mockResolvedValue(data.invoices ?? []);
  prisma.companySubscription.findMany.mockResolvedValue(data.subscriptions ?? []);
  prisma.company.findMany.mockResolvedValue(data.companies ?? []);
  prisma.manualContract.findMany.mockResolvedValue(data.contracts ?? []);
}

describe('PlatformFinanceService.summary', () => {
  it('keeps invoice totals real instead of filling billed and open with MRR', async () => {
    const { prisma, service } = createService();
    configureQueries(prisma, {
      subscriptions: [{
        companyId: 'company-1',
        seatQuantity: 10,
        baseMonthlyPrice: decimal(200),
        userMonthlyPrice: decimal(5),
        discountPercent: decimal(0),
        plan: null,
        company: { id: 'company-1', name: 'Empresa 1' },
      }],
    });

    const result = await service.summary({});

    expect(result.mrr).toBe(250);
    expect(result.totals).toEqual({ billed: 0, received: 0, open: 0, overdue: 0, canceled: 0 });
    expect(result.conversionRate).toBe(0);
    expect(result.mrrQuality).toMatchObject({
      status: 'COMPLETE',
      includedCompanies: 1,
      incompleteCompanies: 0,
      sources: { subscriptions: 1, contracts: 0, plans: 0 },
    });
  });

  it('calculates actual invoice totals independently from recurring revenue', async () => {
    const { prisma, service } = createService();
    configureQueries(prisma, {
      invoices: [
        { amount: decimal(100), status: 'PAID', dueDate: new Date('2026-07-10'), paidAt: new Date('2026-07-09') },
        { amount: decimal(80), status: 'OPEN', dueDate: new Date('2026-07-20'), paidAt: null },
        { amount: decimal(30), status: 'OVERDUE', dueDate: new Date('2026-07-01'), paidAt: null },
        { amount: decimal(25), status: 'CANCELED', dueDate: new Date('2026-07-05'), paidAt: null },
      ],
    });

    const result = await service.summary({});

    expect(result.totals).toEqual({ billed: 210, received: 100, open: 80, overdue: 30, canceled: 25 });
    expect(result.conversionRate).toBe(47.6);
    expect(result.monthly).toEqual([{ month: '2026-07', billed: 210, received: 100 }]);
  });

  it('uses subscription snapshot first and applies its configured discount', async () => {
    const { prisma, service } = createService();
    configureQueries(prisma, {
      subscriptions: [{
        companyId: 'company-1',
        seatQuantity: 4,
        baseMonthlyPrice: decimal(300),
        userMonthlyPrice: decimal(10),
        discountPercent: decimal(10),
        plan: {
          price: decimal(999),
          baseMonthlyPrice: decimal(999),
          userMonthlyPrice: decimal(99),
          discountPercent: decimal(0),
          isFree: false,
        },
        company: { id: 'company-1', name: 'Empresa Snapshot' },
      }],
    });

    const result = await service.summary({});

    expect(result.mrr).toBe(310);
  });

  it('uses configured plan values when subscription snapshot fields are absent', async () => {
    const { prisma, service } = createService();
    configureQueries(prisma, {
      subscriptions: [{
        companyId: 'company-1',
        seatQuantity: 3,
        baseMonthlyPrice: null,
        userMonthlyPrice: null,
        discountPercent: null,
        plan: {
          price: decimal(250),
          baseMonthlyPrice: decimal(0),
          userMonthlyPrice: decimal(5),
          discountPercent: decimal(20),
          isFree: false,
        },
        company: { id: 'company-1', name: 'Empresa Plano' },
      }],
    });

    const result = await service.summary({});

    expect(result.mrr).toBe(215);
    expect(result.mrrQuality.status).toBe('COMPLETE');
  });

  it('never invents a fixed MRR for a paid company without configured pricing', async () => {
    const { prisma, service } = createService();
    configureQueries(prisma, {
      companies: [{
        id: 'company-missing',
        name: 'Empresa Sem Preco',
        maxUsers: 8,
        platformPlan: null,
      }],
    });

    const result = await service.summary({});

    expect(result.mrr).toBe(0);
    expect(result.totals.billed).toBe(0);
    expect(result.mrrQuality).toEqual({
      status: 'PARTIAL',
      currency: 'BRL',
      includedCompanies: 0,
      incompleteCompanies: 1,
      sources: { subscriptions: 0, contracts: 0, plans: 0 },
      issues: [{
        companyId: 'company-missing',
        companyName: 'Empresa Sem Preco',
        code: 'MISSING_PRICING',
        message: 'Empresa ativa em plano pago sem assinatura, contrato vigente ou preço de plano completo.',
      }],
    });
  });

  it('uses one recurring source per company and reports subscription-contract conflicts', async () => {
    const { prisma, service } = createService();
    configureQueries(prisma, {
      subscriptions: [{
        companyId: 'company-1',
        seatQuantity: 1,
        baseMonthlyPrice: decimal(100),
        userMonthlyPrice: decimal(0),
        discountPercent: decimal(0),
        plan: null,
        company: { id: 'company-1', name: 'Empresa Duplicada' },
      }],
      contracts: [{
        companyId: 'company-1',
        agreedAmount: decimal(500),
        startsAt: new Date('2026-01-01'),
        endsAt: null,
        company: { id: 'company-1', name: 'Empresa Duplicada' },
      }],
    });

    const result = await service.summary({});

    expect(result.mrr).toBe(100);
    expect(result.mrrQuality.status).toBe('PARTIAL');
    expect(result.mrrQuality.sources).toEqual({ subscriptions: 1, contracts: 0, plans: 0 });
    expect(result.mrrQuality.issues[0].code).toBe('MULTIPLE_RECURRING_SOURCES');
  });

  it('uses a single current manual contract and ignores future or expired contracts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T12:00:00Z'));
    const { prisma, service } = createService();
    configureQueries(prisma, {
      contracts: [
        {
          companyId: 'current',
          agreedAmount: decimal(180),
          startsAt: new Date('2026-01-01'),
          endsAt: new Date('2026-12-31'),
          company: { id: 'current', name: 'Contrato Atual' },
        },
        {
          companyId: 'future',
          agreedAmount: decimal(900),
          startsAt: new Date('2026-08-01'),
          endsAt: null,
          company: { id: 'future', name: 'Contrato Futuro' },
        },
        {
          companyId: 'expired',
          agreedAmount: decimal(700),
          startsAt: new Date('2025-01-01'),
          endsAt: new Date('2026-01-31'),
          company: { id: 'expired', name: 'Contrato Expirado' },
        },
      ],
    });

    const result = await service.summary({});

    expect(result.mrr).toBe(180);
    expect(result.mrrQuality.sources.contracts).toBe(1);
    vi.useRealTimers();
  });

  it('excludes ambiguous multiple current contracts instead of summing them', async () => {
    const { prisma, service } = createService();
    const company = { id: 'company-1', name: 'Empresa Ambigua' };
    configureQueries(prisma, {
      contracts: [
        { companyId: company.id, agreedAmount: decimal(100), startsAt: new Date('2026-01-01'), endsAt: null, company },
        { companyId: company.id, agreedAmount: decimal(200), startsAt: new Date('2026-02-01'), endsAt: null, company },
      ],
    });

    const result = await service.summary({});

    expect(result.mrr).toBe(0);
    expect(result.mrrQuality.issues[0].code).toBe('MULTIPLE_ACTIVE_CONTRACTS');
  });

  it('calculates a legacy configured plan with the company seat limit', async () => {
    const { prisma, service } = createService();
    configureQueries(prisma, {
      companies: [{
        id: 'legacy',
        name: 'Empresa Legada',
        maxUsers: 6,
        platformPlan: {
          price: decimal(200),
          baseMonthlyPrice: decimal(200),
          userMonthlyPrice: decimal(10),
          discountPercent: decimal(5),
          isFree: false,
        },
      }],
    });

    const result = await service.summary({});

    expect(result.mrr).toBe(250);
    expect(result.mrrQuality.sources).toEqual({ subscriptions: 0, contracts: 0, plans: 1 });
  });

  it('applies the commercial owner scope consistently to every MRR source', async () => {
    const { prisma, service } = createService();
    configureQueries(prisma);

    await service.summary({}, 'owner-1');

    expect(prisma.companySubscription.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'ACTIVE', company: { status: 'ACTIVE', commercialOwnerId: 'owner-1' } },
    }));
    expect(prisma.company.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'ACTIVE', commercialOwnerId: 'owner-1' }),
    }));
    expect(prisma.manualContract.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'ACTIVE', company: { status: 'ACTIVE', commercialOwnerId: 'owner-1' } },
    }));
  });
});

describe('PlatformFinanceService.ensureManualContractBilling', () => {
  it('does not create a charge with a fixed fallback when the company has no configured plan', async () => {
    const { prisma, pricingService, service } = createService();
    prisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      name: 'Empresa sem plano',
      platformPlan: null,
      subscription: null,
      users: [],
    });

    const result = await service.ensureManualContractBilling('company-1', new Date('2026-08-10'));

    expect(result).toEqual({
      configured: false,
      created: false,
      reason: 'MISSING_PLAN_PRICING',
    });
    expect(pricingService.calculate).not.toHaveBeenCalled();
  });
});
