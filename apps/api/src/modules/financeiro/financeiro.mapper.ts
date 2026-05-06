import type { FinanceiroSummary } from '../../../../../modules/financeiro/src/financeiro.types';

export function mapFinanceiroSummary(summary: FinanceiroSummary) {
  return {
    ...summary,
    service: 'innovation-api',
  };
}
