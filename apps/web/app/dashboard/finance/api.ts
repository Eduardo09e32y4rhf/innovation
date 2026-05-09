'use client';

import { getApiBaseUrl, getAuthHeaders } from '../whatsapp/api';

export type FinanceType = 'REVENUE' | 'EXPENSE';
export type FinanceStatus = 'PENDING' | 'PAID' | 'CANCELED';

export type FinanceTransaction = {
  id: string;
  description: string;
  amount: string | number;
  type: FinanceType;
  status: FinanceStatus;
  dueDate?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type CashFlowPoint = {
  mes: string;
  entrada: number;
  saida: number;
};

export type CategoryPoint = {
  cat: string;
  val: number;
};

export type FinanceSummary = {
  revenueMonth: number;
  expenseMonth: number;
  balanceMonth: number;
  pendingRevenue: number;
  pendingExpense: number;
  pendingCount: number;
  dueSoonTotal: number;
  cashFlow: CashFlowPoint[];
  categories: CategoryPoint[];
  recent: FinanceTransaction[];
};

export type CreateFinanceTransactionInput = {
  description: string;
  amount: number;
  type: FinanceType;
  status?: FinanceStatus;
  dueDate?: string;
};

export type DdaProviderId = 'MERCADOPAGO' | 'PAGBANK' | 'ASAAS';

export type DdaProvider = {
  id: DdaProviderId;
  name: string;
  initials: string;
  connected: boolean;
  balance: number;
  scope: string;
  lastSyncAt: string | null;
};

export type DdaBoleto = {
  id: string;
  bankId: DdaProviderId;
  providerName: string;
  description: string;
  amount: number;
  dueDate: string;
  barcode: string;
  status: 'PENDING' | 'RECONCILED' | 'CANCELED';
  source: 'BOLETO' | 'PIX' | 'CARD' | 'TRANSFER';
};

export const fallbackSummary: FinanceSummary = {
  revenueMonth: 0,
  expenseMonth: 0,
  balanceMonth: 0,
  pendingRevenue: 0,
  pendingExpense: 0,
  pendingCount: 0,
  dueSoonTotal: 0,
  cashFlow: [],
  categories: [],
  recent: [],
};

export const fallbackDdaProviders: DdaProvider[] = [];
export const fallbackDdaBoletos: DdaBoleto[] = [];

async function unwrap<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Finance API failed with ${response.status}`);
  const payload = await response.json();
  return (payload?.data ?? payload) as T;
}

async function financeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  return unwrap<T>(response);
}

export async function getFinanceSummary() {
  try {
    return await financeFetch<FinanceSummary>('/finance/summary');
  } catch {
    return fallbackSummary;
  }
}

export async function getFinanceTransactions() {
  try {
    return await financeFetch<FinanceTransaction[]>('/finance/transactions');
  } catch {
    return [];
  }
}

export async function getFinanceDue(days = 30) {
  try {
    return await financeFetch<FinanceTransaction[]>(`/finance/due?days=${days}`);
  } catch {
    return [];
  }
}

export async function createFinanceTransaction(input: CreateFinanceTransactionInput) {
  return financeFetch<FinanceTransaction>('/finance/transactions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateFinanceTransaction(id: string, input: Partial<CreateFinanceTransactionInput>) {
  return financeFetch<FinanceTransaction>(`/finance/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function getDdaProviders() {
  try {
    return await financeFetch<DdaProvider[]>('/finance/dda/providers');
  } catch {
    return [];
  }
}

export async function connectDdaProvider(bank: DdaProviderId) {
  return financeFetch<DdaProvider>(`/finance/dda/providers/${bank}/connect`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getDdaBoletos(bank?: DdaProviderId) {
  const query = bank ? `?bank=${bank}` : '';
  try {
    return await financeFetch<DdaBoleto[]>(`/finance/dda/boletos${query}`);
  } catch {
    return [];
  }
}

export async function reconcileDdaBoleto(boleto: DdaBoleto) {
  return financeFetch<DdaBoleto>(`/finance/dda/boletos/${boleto.id}/reconcile`, {
    method: 'POST',
    body: JSON.stringify({ bank: boleto.bankId }),
  });
}

export function toNumber(value: string | number) {
  return typeof value === 'number' ? value : Number(value);
}

export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

export function inferFinanceCategory(description: string) {
  const text = description.toLowerCase();
  if (text.includes('mensalidade') || text.includes('plano') || text.includes('licenca')) return 'SaaS';
  if (text.includes('setup') || text.includes('implant')) return 'Servicos';
  if (text.includes('consult')) return 'Consultoria';
  if (text.includes('campanha') || text.includes('marketing')) return 'Marketing';
  if (text.includes('cloud') || text.includes('aws') || text.includes('software')) return 'Tecnologia';
  return 'Outros';
}
