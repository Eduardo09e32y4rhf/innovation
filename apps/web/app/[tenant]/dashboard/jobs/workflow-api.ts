import { request } from '@/app/lib/api';

export interface PendingApproval { id: string; title: string; department: string | null; openings: number; createdAt: string; step: string; stepLabel: string }
export interface ApprovalRow { id: string; step: string; label: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; current: boolean; note: string | null; decidedByName: string | null; decidedAt: string | null }
export interface BudgetRow { department: string; budget: number | null; used: number }
export interface TemplateRow { id: string; name: string; createdAt: string }
const enc = encodeURIComponent;

export const workflowApi = {
  steps: () => request<{ steps: string[] }>('/job-workflow/steps'),
  saveSteps: (steps: string[]) => request<{ steps: string[] }>('/job-workflow/steps', { method: 'PUT', body: { steps } }),
  pending: () => request<PendingApproval[]>('/job-workflow/pending'),
  approvals: (jobId: string) => request<ApprovalRow[]>(`/job-workflow/jobs/${enc(jobId)}/approvals`),
  decide: (jobId: string, body: { approve: boolean; note?: string }) => request<{ outcome: string }>(`/job-workflow/jobs/${enc(jobId)}/decide`, { method: 'POST', body }),
  budgets: () => request<BudgetRow[]>('/job-workflow/budgets'),
  saveBudget: (department: string, budget: number | null) => request<BudgetRow[]>('/job-workflow/budgets', { method: 'PUT', body: { department, budget } }),
  templates: () => request<TemplateRow[]>('/job-workflow/templates'),
  createTemplate: (jobId: string, name: string) => request<TemplateRow>('/job-workflow/templates', { method: 'POST', body: { jobId, name } }),
  removeTemplate: (id: string) => request<unknown>(`/job-workflow/templates/${enc(id)}`, { method: 'DELETE' }),
  useTemplate: (id: string) => request<{ id: string }>(`/job-workflow/templates/${enc(id)}/use`, { method: 'POST', body: {} }),
};