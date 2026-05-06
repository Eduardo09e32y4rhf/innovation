import { ContabilidadeRepository } from '../repositories/contabilidade.repository';
import { AccountingEntry, AccountingReport, FinanceIntegrationPayload } from '../types/contabilidade.types';

export class ContabilidadeService {
  constructor(private readonly repository: ContabilidadeRepository) {}

  async registerEntry(entry: AccountingEntry): Promise<AccountingEntry> {
    return this.repository.saveEntry(entry);
  }

  async getReports(period: string): Promise<AccountingReport> {
    const entries = await this.repository.listEntries(period);
    return {
      period,
      trialBalance: entries.flatMap((entry) =>
        entry.lines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
        })),
      ),
    };
  }

  mapFinanceTransaction(payload: FinanceIntegrationPayload): AccountingEntry {
    return {
      id: payload.accountingEntryId ?? payload.sourceTransactionId,
      date: payload.date,
      description: payload.description,
      source: 'finance',
      lines: [
        { accountId: 'finance-clearing', debit: payload.amount, credit: 0 },
        { accountId: 'offset-account', debit: 0, credit: payload.amount },
      ],
    };
  }
}

