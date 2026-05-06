import { FinanceiroDomainService } from './financeiro.service';

export function createFinanceiroModule() {
  return {
    name: 'financeiro',
    service: new FinanceiroDomainService(),
  };
}
