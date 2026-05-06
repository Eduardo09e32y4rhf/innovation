import { AccountingEntry } from '../types/contabilidade.types';

export function isBalancedEntry(entry: AccountingEntry): boolean {
  const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);
  return totalDebit === totalCredit;
}

export function validateEntry(entry: AccountingEntry): string[] {
  const errors: string[] = [];

  if (!entry.id) errors.push('Entry id is required');
  if (!entry.date) errors.push('Entry date is required');
  if (!entry.description) errors.push('Entry description is required');
  if (!entry.lines?.length) errors.push('Entry must contain at least one line');
  if (entry.lines && !isBalancedEntry(entry)) errors.push('Entry must be balanced');

  return errors;
}

