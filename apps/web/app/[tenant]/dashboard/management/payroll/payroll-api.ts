import { request } from '@/app/lib/api';

import type { CreatePayrollInput, CreatePayrollResult, ManualItemInput, PayrollItem } from './types';

const base = (id: string) => `/payroll/${encodeURIComponent(id)}`;

export const payrollApi = {
  get: (id: string) => request<PayrollItem>(base(id)),
  list: (from: string, to: string) => request<PayrollItem[]>(`/payroll?from=${from}&to=${to}`),
  create: (input: CreatePayrollInput) => request<CreatePayrollResult>('/payroll', { method: 'POST', body: input, timeoutMs: 60000 }),
  update: (id: string, input: { periodStart?: string; periodEnd?: string; observations?: string; items?: ManualItemInput[] }) =>
    request<PayrollItem>(base(id), { method: 'PATCH', body: input }),
  recalculate: (id: string) => request<PayrollItem>(`${base(id)}/recalculate`, { method: 'POST' }),
  approve: (id: string) => request<PayrollItem>(`${base(id)}/approve`, { method: 'PATCH' }),
  reopen: (id: string) => request<PayrollItem>(`${base(id)}/reopen`, { method: 'PATCH' }),
  markAsPaid: (id: string) => request<PayrollItem>(`${base(id)}/paid`, { method: 'PATCH' }),
  cancel: (id: string, reason: string) => request<PayrollItem>(`${base(id)}/cancel`, { method: 'PATCH', body: { reason } }),
  remove: (id: string) => request<{ message: string }>(base(id), { method: 'DELETE' }),
};