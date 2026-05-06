export * from './types/financeiro.types';
export * from './types/financeiro.dto';

export interface FinanceiroStatus {
  status: 'ok';
  module: 'financeiro';
  mode: 'domain-package';
}

export interface FinanceiroSummary {
  module: 'financeiro';
  plans: number;
  activePlans: number;
}
