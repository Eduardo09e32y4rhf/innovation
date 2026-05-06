import type { ContabilidadeSummary } from '../../../../../modules/contabilidade/src/contabilidade.types';

export function mapContabilidadeSummary(summary: ContabilidadeSummary) {
  return {
    ...summary,
    service: 'innovation-api',
  };
}
