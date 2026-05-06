import { AccountingEntry, ChartOfAccount } from '../types/contabilidade.types';

export interface ContabilidadeRepository {
  listAccounts(): Promise<ChartOfAccount[]>;
  listEntries(period?: string): Promise<AccountingEntry[]>;
  saveEntry(entry: AccountingEntry): Promise<AccountingEntry>;
}

export class InMemoryContabilidadeRepository implements ContabilidadeRepository {
  private readonly accounts: ChartOfAccount[] = [];
  private readonly entries: AccountingEntry[] = [];

  async listAccounts(): Promise<ChartOfAccount[]> {
    return [...this.accounts];
  }

  async listEntries(): Promise<AccountingEntry[]> {
    return [...this.entries];
  }

  async saveEntry(entry: AccountingEntry): Promise<AccountingEntry> {
    this.entries.push(entry);
    return entry;
  }
}

