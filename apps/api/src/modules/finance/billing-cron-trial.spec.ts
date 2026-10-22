import { afterEach, describe, expect, it, vi } from 'vitest';
import { BillingCronService } from './billing-cron.service';

function make() {
  const prisma: any = {
    company: { findMany: vi.fn(async () => []), update: vi.fn(async () => ({})) },
    manualContract: { findMany: vi.fn(async () => []) },
  };
  const trialConversion = { generateFirstInvoice: vi.fn(async () => ({ created: true, invoiceId: 'i1', amountCents: 100 })), sendCountdownWarnings: vi.fn(async () => ({ checked: 0, internal: 0, emails: 0 })) };
  const service = new BillingCronService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, undefined as any, {} as any, {} as any, trialConversion as any);
  return { service, prisma, trialConversion };
}

afterEach(() => { delete process.env.FEATURE_PROPOSALS; delete process.env.FEATURE_MANUAL_CONTRACTS; });

describe('billing-cron com modulos congelados', () => {
  it('sem FEATURE_PROPOSALS nao cria propostas; sem FEATURE_MANUAL_CONTRACTS nao encerra contratos manuais', async () => {
    const { service, prisma } = make();
    await service.createTrialConversionProposals();
    await service.checkExpiredManualContracts();
    expect(prisma.company.findMany).not.toHaveBeenCalled();
    expect(prisma.manualContract.findMany).not.toHaveBeenCalled();
  });
  it('com as flags ligadas mantem o caminho antigo', async () => {
    process.env.FEATURE_PROPOSALS = 'true';
    process.env.FEATURE_MANUAL_CONTRACTS = 'true';
    const { service, prisma } = make();
    await service.createTrialConversionProposals();
    await service.checkExpiredManualContracts();
    expect(prisma.company.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.manualContract.findMany).toHaveBeenCalledTimes(1);
  });
  it('fim do teste sem propostas gera a primeira fatura da empresa que nao recusou; recusada nao gera', async () => {
    const { service, prisma, trialConversion } = make();
    prisma.company.findMany
      .mockResolvedValueOnce([{ id: 'c1', subscription: { trialDeclinedAt: null } }])
      .mockResolvedValueOnce([]);
    await service.checkExpiredTrials();
    expect(prisma.company.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ billingStatus: 'PENDING_PAYMENT' }) }));
    expect(trialConversion.generateFirstInvoice).toHaveBeenCalledWith('c1', expect.any(Date));
  });
  it('com FEATURE_PROPOSALS ligado o fim do teste nao gera fatura direta', async () => {
    process.env.FEATURE_PROPOSALS = 'true';
    const { service, prisma, trialConversion } = make();
    prisma.company.findMany.mockResolvedValueOnce([{ id: 'c1', subscription: { trialDeclinedAt: null } }]);
    await service.checkExpiredTrials();
    expect(trialConversion.generateFirstInvoice).not.toHaveBeenCalled();
  });
  it('o cron de avisos delega ao servico', async () => {
    const { service, trialConversion } = make();
    await service.sendTrialCountdownWarnings();
    expect(trialConversion.sendCountdownWarnings).toHaveBeenCalledTimes(1);
  });
});
