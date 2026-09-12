import { request } from '@/app/lib/api';

import type { CreatePayrollInput, PayrollItem } from './types';

type CollectionResponse<T> = T[] | { items?: T[]; results?: T[] };

function collection<T>(payload: CollectionResponse<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.items ?? payload.results ?? [];
}

export const payrollApi = {
  async list(year: number, month: number): Promise<PayrollItem[]> {
    const payload = await request<CollectionResponse<PayrollItem>>(
      `/payroll?year=${year}&month=${month}`,
    );
    return collection(payload);
  },

  create(input: CreatePayrollInput): Promise<PayrollItem> {
    return request<PayrollItem>('/payroll', { method: 'POST', body: input });
  },

  approve(id: string): Promise<PayrollItem> {
    return request<PayrollItem>(`/payroll/${encodeURIComponent(id)}/approve`, {
      method: 'PATCH',
    });
  },

  markAsPaid(id: string): Promise<PayrollItem> {
    return request<PayrollItem>(`/payroll/${encodeURIComponent(id)}/paid`, {
      method: 'PATCH',
    });
  },

  remove(id: string): Promise<void> {
    return request<void>(`/payroll/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};