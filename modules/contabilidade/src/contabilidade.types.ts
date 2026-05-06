export * from './types/contabilidade.types';

export interface ContabilidadeStatus {
  status: 'ok';
  module: 'contabilidade';
  mode: 'domain-package';
}

export interface ContabilidadeSummary {
  module: 'contabilidade';
  entries: number;
  accounts: number;
}
