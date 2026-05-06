import { InMemoryContabilidadeRepository } from './repositories/contabilidade.repository';
import type { ContabilidadeStatus, ContabilidadeSummary } from './contabilidade.types';

export class ContabilidadeDomainService {
  private readonly repository = new InMemoryContabilidadeRepository();

  getStatus(): ContabilidadeStatus {
    return {
      status: 'ok',
      module: 'contabilidade',
      mode: 'domain-package',
    };
  }

  async getSummary(): Promise<ContabilidadeSummary> {
    const [entries, accounts] = await Promise.all([
      this.repository.listEntries(),
      this.repository.listAccounts(),
    ]);

    return {
      module: 'contabilidade',
      entries: entries.length,
      accounts: accounts.length,
    };
  }
}

export * from './services/contabilidade.service';
