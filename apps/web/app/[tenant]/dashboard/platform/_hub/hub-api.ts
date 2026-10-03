import { request } from '@/app/lib/api';
import { downloadFile } from '@/app/lib/download';
import type { AccountingOverview, CompanyOption, Overview, RulesPayload, SimulationResult } from './types';

function qs(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const platformHub = {
  companies: (q?: string) => request<CompanyOption[]>(`/platform-hub/companies${qs({ q })}`),
  overview: (companyId?: string) => request<Overview>(`/platform-hub/overview${qs({ companyId })}`),

  accounting: (month: string, companyId?: string) => request<AccountingOverview>(`/accounting/overview${qs({ month, companyId })}`),
  accountingPdf: (month: string, companyId?: string) => downloadFile(`/accounting/report/pdf${qs({ month, companyId })}`, `relatorio-contabil-${month}.pdf`),
  rules: () => request<RulesPayload>('/accounting/rules'),
  saveRule: (body: Record<string, unknown>) => request<{ id: string; version: string }>('/accounting/rules', { method: 'POST', body }),
  deactivateRule: (id: string) => request<unknown>(`/accounting/rules/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  simulate: (body: Record<string, unknown>) => request<SimulationResult>('/accounting/rules/simulate', { method: 'POST', body }),
  recalculateClosings: (companyId: string, month: string) => request<{ generated: number }>('/accounting/closings/recalculate', { method: 'POST', body: { companyId, month }, timeoutMs: 120000 }),
  adjustClosing: (id: string, body: { field: string; newValue: number; reason: string }) => request<unknown>(`/accounting/closings/${encodeURIComponent(id)}/adjust`, { method: 'PATCH', body }),
  recalculatePayroll: (id: string) => request<unknown>(`/accounting/payroll/${encodeURIComponent(id)}/recalculate`, { method: 'POST', body: {} }),
  correctPayroll: (id: string, body: { baseSalary?: number; overtimeAmount?: number; nightShiftAmount?: number; reason: string }) => request<unknown>(`/accounting/payroll/${encodeURIComponent(id)}`, { method: 'PUT', body }),
};
