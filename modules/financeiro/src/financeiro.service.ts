import { mockPlans } from './data/financeiro.mock-data';
import type { FinanceiroStatus, FinanceiroSummary } from './financeiro.types';

export class FinanceiroDomainService {
  getStatus(): FinanceiroStatus {
    return {
      status: 'ok',
      module: 'financeiro',
      mode: 'domain-package',
    };
  }

  getSummary(): FinanceiroSummary {
    return {
      module: 'financeiro',
      plans: mockPlans.length,
      activePlans: mockPlans.filter((plan) => plan.active).length,
    };
  }
}

export * from './services/financeiro.service';
export * from './services/financeiro.mock-service';
