import { describe, expect, it, vi } from 'vitest';
import { PlatformFinanceService } from './platform-finance.service';

function setup(options: { customerId?: string; configured?: boolean; provider?: string; status?: string } = {}) {
  const company = { id: 'c1', name: 'Loja da Ana', document: '11222333000181', email: 'ana@example.com', billingStatus: options.status ?? 'TRIAL',
    platformPlan: { isFree: false }, asaasCustomerId: options.customerId ?? null, subscription: {}, users: [{ role: 'ADMIN', email: 'ana@example.com' }] };
  const prisma: any = {
    company: { findUnique: vi.fn(async () => company), update: vi.fn(async ({ data }: any) => Object.assign(company, data)) },
    companySubscription: { updateMany: vi.fn(async () => ({ count: 1 })) },
    auditLog: { create: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  const asaas: any = { isConfigured: () => options.configured !== false, createCustomer: vi.fn(async () => ({ id: 'cus_1' })), createCharge: vi.fn(), createSubscription: vi.fn() };
  const service = new PlatformFinanceService(prisma, asaas, {} as any, { isConfigured: () => true } as any, { active: async () => options.provider ?? 'ASAAS' } as any);
  return { service, prisma, asaas, company };
}

describe('cadastro financeiro no teste de recrutamento', () => {
  it('vincula o cliente a empresa e assinatura, sem fatura nem recorrencia', async () => {
    const { service, prisma, asaas } = setup();
    await expect(service.prepareTrialBillingAccount('c1')).resolves.toEqual({ pending: false });
    expect(asaas.createCustomer).toHaveBeenCalledWith(expect.objectContaining({ cpfCnpj: '11222333000181', externalReference: 'c1', notificationDisabled: true }));
    expect(prisma.companySubscription.updateMany).toHaveBeenCalledWith({ where: { companyId: 'c1' }, data: { asaasCustomerId: 'cus_1' } });
    expect(asaas.createCharge).not.toHaveBeenCalled();
    expect(asaas.createSubscription).not.toHaveBeenCalled();
  });
  it('uma nova tentativa reutiliza o cliente vinculado', async () => {
    const { service, asaas } = setup();
    await service.prepareTrialBillingAccount('c1');
    await service.prepareTrialBillingAccount('c1');
    expect(asaas.createCustomer).toHaveBeenCalledTimes(1);
  });
  it('duas tentativas simultaneas nao abrem dois clientes', async () => {
    const { service, asaas } = setup();
    await Promise.all([service.prepareTrialBillingAccount('c1'), service.prepareTrialBillingAccount('c1')]);
    expect(asaas.createCustomer).toHaveBeenCalledTimes(1);
  });
  it('sem configuracao devolve pendencia sem simular sucesso', async () => {
    const { service, asaas } = setup({ configured: false });
    await expect(service.prepareTrialBillingAccount('c1')).resolves.toEqual({ pending: true });
    expect(asaas.createCustomer).not.toHaveBeenCalled();
  });
  it('Mercado Pago nao abre um cliente Asaas', async () => {
    const { service, asaas } = setup({ provider: 'MERCADOPAGO' });
    await expect(service.prepareTrialBillingAccount('c1')).resolves.toEqual({ pending: false });
    expect(asaas.createCustomer).not.toHaveBeenCalled();
  });
  it('nao converte conta fora do teste nem altera sua cobranca', async () => {
    const { service, asaas } = setup({ status: 'PENDING_PAYMENT' });
    await expect(service.prepareTrialBillingAccount('c1')).resolves.toEqual({ pending: false });
    expect(asaas.createCustomer).not.toHaveBeenCalled();
  });
});
