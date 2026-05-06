export type AccountNature = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  nature: AccountNature;
  parentId?: string | null;
  active: boolean;
}

export interface AccountingEntryLine {
  accountId: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface AccountingEntry {
  id: string;
  date: string;
  description: string;
  reference?: string;
  source?: 'manual' | 'finance';
  lines: AccountingEntryLine[];
  exportedAt?: string | null;
}

export interface AccountingReport {
  period: string;
  trialBalance: Array<{ accountId: string; debit: number; credit: number }>;
  balanceSheet?: Record<string, number>;
  incomeStatement?: Record<string, number>;
}

export interface FinanceIntegrationPayload {
  sourceTransactionId: string;
  accountingEntryId?: string;
  amount: number;
  date: string;
  description: string;
}

export interface ExportPayload {
  format: 'csv' | 'json' | 'pdf';
  period: string;
  entries: AccountingEntry[];
}

