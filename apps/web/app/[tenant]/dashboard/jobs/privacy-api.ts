import { request } from '@/app/lib/api';

export interface RecruitmentSettings { retentionMonths: number; receiptEmail: boolean; rejectionEmail: boolean; rejectionMessage: string; privacyVersion: string }
export interface PrivacyRequest { id: string; email: string; type: 'ACCESS' | 'CORRECTION' | 'DELETION'; message: string | null; status: 'OPEN' | 'DONE'; response: string | null; createdAt: string; resolvedAt: string | null; dueAt?: string | null; confirmedAt?: string | null; decision?: 'EXECUTED' | 'DENIED' | null }

export const privacyApi = {
  settings: () => request<RecruitmentSettings>('/recruitment-privacy/settings'),
  saveSettings: (body: Partial<RecruitmentSettings>) => request<RecruitmentSettings>('/recruitment-privacy/settings', { method: 'PUT', body }),
  requests: (status?: string) => request<PrivacyRequest[]>(`/recruitment-privacy/requests${status ? `?status=${status}` : ''}`),
  exportData: (id: string) => request<unknown>(`/recruitment-privacy/requests/${encodeURIComponent(id)}/export`),
  answer: (id: string, body: { response: string; perform?: boolean }) => request<PrivacyRequest>(`/recruitment-privacy/requests/${encodeURIComponent(id)}/answer`, { method: 'POST', body }),
};