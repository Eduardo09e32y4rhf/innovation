import { describe, expect, it, vi } from 'vitest';
import { AsaasWebhookProcessorService } from './asaas-webhook.processor';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';

function setup(existingStatus: string) {
  const companyUpdates: any[] = [];
  const touched: string[] = [];
  const base: any = {
    asaasWebhookEvent: {
      updateMany: async () => ({ count: 1 }),
      findUnique: async () => ({ payload: { event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1', value: 100, status: 'RECEIVED', customer: 'cus_1', billingType: 'PIX', dueDate: '2026-12-01', externalReference: 'inv:inv-1' } } }),
      update: async () => ({}),
    },
    platformInvoice: {
      findUnique: async () => ({ id: 'inv-1', companyId: COMPANY_ID, amount: 100, status: existingStatus, asaasPaymentId: 'pay_1', paidAt: null, company: { id: COMPANY_ID } }),
      update: async (arg: any) => ({ id: 'inv-1', ...arg.data }),
      create: async (arg: any) => ({ id: 'inv-1', ...arg.data }),
      findMany: async () => [],
    },
    company: { update: async (arg: any) => { companyUpdates.push(arg.data); return {}; }, findFirst: async () => ({ id: COMPANY_ID }) },
    proposal: { findFirst: async () => null },
    companySubscription: { findUnique: async () => null },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  // Qualquer acesso a usuários ou sessões na reativação derrubaria o login do admin: o teste falha se acontecer.
  const prisma = new Proxy(base, {
    get(target, prop: string) {
      if (['user', 'refreshSession', 'session'].includes(prop)) touched.push(prop);
      return target[prop];
    },
  });
  const notifications: any = { notify: vi.fn(async () => undefined) };
  const processor = new AsaasWebhookProcessorService(prisma, notifications, { isConfigured: () => false } as any, {} as any);
  return { processor, companyUpdates, touched };
}

describe('reativação da empresa após pagamento (webhook Asaas)', () => {
  it('reativa só a empresa: não toca em usuários nem em sessões (token do admin segue válido)', async () => {
    const { processor, companyUpdates, touched } = setup('OVERDUE');
    await processor.processStoredEvent('evt-1');
    expect(companyUpdates).toEqual([{ billingStatus: 'ACTIVE', status: 'ACTIVE', isActive: true, suspensionReason: null }]);
    expect(touched).toEqual([]);
  });

  it('a reativação não altera credenciais (passwordChangedAt) nem desativa usuários', async () => {
    const { processor, companyUpdates } = setup('OPEN');
    await processor.processStoredEvent('evt-2');
    const keys = Object.keys(companyUpdates[0]);
    expect(keys.some((key) => /password|session|token/i.test(key))).toBe(false);
  });

  it('fatura já paga reprocessada (duplicado) não reabre nada nem mexe em sessões', async () => {
    const { processor, touched } = setup('PAID');
    await processor.processStoredEvent('evt-3');
    expect(touched).toEqual([]);
  });
});
