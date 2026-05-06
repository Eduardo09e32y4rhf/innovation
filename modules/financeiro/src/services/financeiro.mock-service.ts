import { mockPlans } from '../data/financeiro.mock-data';
import { InMemoryFinanceiroRepository } from '../repository/financeiro.repository';
import { FinanceiroService } from './financeiro.service';
import { toSafeMoney } from '../utils/money';

export const createMockFinanceiroService = () => {
  const repository = new InMemoryFinanceiroRepository({
    plans: mockPlans,
    subscriptions: [
      {
        id: 'sub-1',
        companyId: 'company-1',
        planId: 'professional',
        planName: 'Professional',
        provider: 'asaas',
        state: 'active',
        currentPeriodEnd: new Date().toISOString(),
        trialEndsAt: null,
        nextAction: null,
        dunning: 'none',
      },
    ],
    invoices: [
      { id: 'company-1-inv-1', paymentId: 'pay-1', description: 'Professional', amount: toSafeMoney(149), status: 'paid', dueAt: new Date().toISOString(), paidAt: new Date().toISOString(), downloadUrl: null },
    ],
    history: [{ id: 'company-1-hist-1', label: 'Pagamento Professional', amount: toSafeMoney(149), status: 'paid', occurredAt: new Date().toISOString() }],
    payments: [{ paymentId: 'pay-1', provider: 'asaas', status: 'paid', publicReference: 'inv_1', updatedAt: new Date().toISOString() }],
  });

  return new FinanceiroService(repository);
};
