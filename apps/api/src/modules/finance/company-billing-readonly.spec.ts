import { describe, expect, it, vi } from 'vitest';
import { PlatformFinanceService } from './platform-finance.service';

/** GET de status nunca grava: qualquer escrita no banco ou no gateway derruba o teste. */
function setup(opts: { remote: { status: string }; provider?: 'ASAAS' | 'MERCADOPAGO'; companyStatus?: string; reason?: string | null }) {
  const writes: string[] = [];
  const write = (name: string) => async () => { writes.push(name); return {}; };
  const company: any = { id: 'c1', status: opts.companyStatus ?? 'SUSPENDED', billingStatus: 'PAST_DUE', suspensionReason: opts.reason ?? 'seguranca', asaasSubscriptionId: null, subscription: null, platformPlan: null, _count: { users: 1, employees: 1 } };
  const invoice: any = { id: 'inv-1', companyId: 'c1', status: 'OVERDUE', amount: 100, dueDate: new Date('2020-01-01'), asaasPaymentId: 'pay_1', mpPaymentId: null, provider: opts.provider ?? 'ASAAS', billingType: 'PIX', invoiceUrl: 'https://x', paidAt: null };
  const prisma: any = {
    company: { findUnique: async () => ({ ...company }), update: write('company.update') },
    user: { count: async () => 1 },
    platformInvoice: { findFirst: async () => ({ ...invoice }), update: write('invoice.update'), updateMany: write('invoice.updateMany') },
    $transaction: write('$transaction'),
  };
  const asaas: any = { isConfigured: () => true, getCharge: async () => ({ status: opts.remote.status, invoiceUrl: 'https://x' }), getSubscription: vi.fn() };
  const mp: any = { isConfigured: () => true, findPaymentForInvoice: async () => ({ id: 77, status: opts.remote.status }), mapStatus: (s: string) => (s === 'approved' ? 'PAID' : 'OPEN') };
  const service = new PlatformFinanceService(prisma, asaas, {} as any, mp, {} as any);
  return { service, writes };
}

describe('PAG-A2: consulta de status da empresa e somente leitura', () => {
  it('Asaas: cobranca RECEIVED no gateway nao grava fatura nem reativa empresa suspensa por seguranca', async () => {
    const { service, writes } = setup({ remote: { status: 'RECEIVED' } });
    const result: any = await service.getCompanyBilling('c1');
    expect(writes).toEqual([]);
    expect(result.active).toBe(false);
    expect(result.company.status).toBe('SUSPENDED');
    expect(result.invoice.status).toBe('OVERDUE');
    expect(result.invoice.gatewayPaid).toBe(true);
  });

  it('Mercado Pago: pagamento approved nao grava nada na consulta', async () => {
    const { service, writes } = setup({ remote: { status: 'approved' }, provider: 'MERCADOPAGO' });
    const result: any = await service.getCompanyBilling('c1');
    expect(writes).toEqual([]);
    expect(result.invoice.gatewayPaid).toBe(true);
  });
});
