import { request } from '@/app/lib/api';

export type Department = 'CONTABIL' | 'FISCAL' | 'DP' | 'LEGALIZACAO' | 'CONSULTORIA' | 'ATENDIMENTO';

export const DEPARTMENTS: Array<[Department, string]> = [
  ['CONTABIL', 'Contábil'], ['FISCAL', 'Fiscal'], ['DP', 'Pessoal / DP'], ['LEGALIZACAO', 'Legalização'], ['CONSULTORIA', 'Consultoria'], ['ATENDIMENTO', 'Atendimento'],
];
export const DEPARTMENT_LABEL: Record<string, string> = Object.fromEntries(DEPARTMENTS);
export const REGIMES: Array<[string, string]> = [['MEI', 'MEI'], ['SIMPLES', 'Simples Nacional'], ['PRESUMIDO', 'Lucro Presumido'], ['REAL', 'Lucro Real']];
export const REGIME_LABEL: Record<string, string> = Object.fromEntries(REGIMES);
export const DOC_TYPES: Array<[string, string]> = [['EXTRATO', 'Extrato bancário'], ['NOTAS', 'Notas fiscais'], ['FOLHA', 'Dados da folha'], ['ATESTADO', 'Atestados / afastamentos'], ['OUTROS', 'Outro documento']];

export interface OfficeClientRow {
  id: string; name: string; document: string | null; regime: string; monthlyFee: number; responsibleId: string | null;
  checklistDone: number; checklistTotal: number; closingsTotal: number; closingsPending: number; payrollsTotal: number; payrollsPending: number;
  docsPending: number; docsTotal: number; tasksOpen: number; feeStatus: 'OPEN' | 'PAID' | 'OVERDUE' | null; feeAmount: number | null;
}
export interface Obligation { key: string; label: string; department: Department; date: string; competencia: string; clients: number; note?: string }
export interface OfficeDashboard {
  period: { key: string; year: number; month: number };
  totals: { clients: number; checklistComplete: number; docsPending: number; tasksOpen: number; feeOpen: number; feePaid: number; feeOverdue: number };
  obligations: Obligation[];
  clients: OfficeClientRow[];
}
export interface ChecklistItem { key: string; label: string; department: string; auto: boolean; done: boolean; hint?: string | null; doneAt?: string | null; note?: string | null }
export interface Movements {
  admissions: Array<{ id: string; name: string; date: string }>; terminations: Array<{ id: string; name: string; date: string }>;
  vacations: Array<{ id: string; name: string; start: string; end: string }>; asoDue: Array<{ id: string; name: string; date: string; type: string }>;
}
export interface OfficeClient { company: { id: string; name: string; document: string | null }; client: { taxRegime: string; responsibleId: string | null; monthlyFee: number; feeDueDay: number; notes: string | null } }
export interface OfficeTask {
  id: string; companyId: string | null; title: string; description: string | null; department: Department; priority: 'LOW' | 'NORMAL' | 'HIGH'; status: 'OPEN' | 'DOING' | 'DONE';
  dueDate: string | null; assigneeId: string | null; completedAt: string | null;
}
export interface DocRequest { id: string; companyId: string; month: string; docType: string; title: string; status: 'PENDING' | 'RECEIVED' | 'CANCELLED'; dueDate: string | null; receivedAt: string | null; lastReminderAt: string | null; reminderCount: number; note: string | null }
export interface Fee { id: string; companyId: string; month: string; amount: number; dueDate: string; status: 'OPEN' | 'PAID' | 'OVERDUE'; paidAt: string | null }
export interface TeamMember { id: string; name: string; role: string }

const qs = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : '';
};
const id = encodeURIComponent;

export const office = {
  dashboard: (month: string) => request<OfficeDashboard>(`/accounting/office/dashboard${qs({ month })}`),
  team: () => request<TeamMember[]>('/accounting/office/team'),
  client: (companyId: string) => request<OfficeClient>(`/accounting/office/clients/${id(companyId)}`),
  saveClient: (companyId: string, body: Record<string, unknown>) => request<unknown>(`/accounting/office/clients/${id(companyId)}`, { method: 'PUT', body }),
  checklist: (companyId: string, month: string) => request<{ items: ChecklistItem[]; movements: Movements }>(`/accounting/office/clients/${id(companyId)}/checklist${qs({ month })}`),
  toggleChecklist: (companyId: string, body: { month: string; itemKey: string; done: boolean }) => request<unknown>(`/accounting/office/clients/${id(companyId)}/checklist`, { method: 'PUT', body }),
  tasks: (params: { status?: string; companyId?: string }) => request<OfficeTask[]>(`/accounting/office/tasks${qs(params)}`),
  createTask: (body: Record<string, unknown>) => request<OfficeTask>('/accounting/office/tasks', { method: 'POST', body }),
  updateTask: (taskId: string, body: Record<string, unknown>) => request<OfficeTask>(`/accounting/office/tasks/${id(taskId)}`, { method: 'PATCH', body }),
  deleteTask: (taskId: string) => request<unknown>(`/accounting/office/tasks/${id(taskId)}`, { method: 'DELETE' }),
  docs: (params: { month?: string; companyId?: string; status?: string }) => request<DocRequest[]>(`/accounting/office/docs${qs(params)}`),
  createDocs: (body: { companyId: string; month: string; dueDate?: string; items: Array<{ docType: string; title: string }> }) => request<{ created: number }>('/accounting/office/docs', { method: 'POST', body }),
  updateDoc: (docId: string, body: Record<string, unknown>) => request<DocRequest>(`/accounting/office/docs/${id(docId)}`, { method: 'PATCH', body }),
  deleteDoc: (docId: string) => request<unknown>(`/accounting/office/docs/${id(docId)}`, { method: 'DELETE' }),
  fees: (month: string) => request<Fee[]>(`/accounting/office/fees${qs({ month })}`),
  generateFees: (month: string) => request<{ generated: number }>('/accounting/office/fees/generate', { method: 'POST', body: { month } }),
  payFee: (feeId: string, paid: boolean) => request<Fee>(`/accounting/office/fees/${id(feeId)}`, { method: 'PATCH', body: { paid } }),
};
