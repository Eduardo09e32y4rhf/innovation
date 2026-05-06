import { ContabilidadeDomainService } from './contabilidade.service';

export function createContabilidadeModule() {
  return {
    name: 'contabilidade',
    service: new ContabilidadeDomainService(),
  };
}
