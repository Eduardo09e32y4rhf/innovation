import { API_URL, ApiError, request } from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';

import type {
  ApplicationDetail,
  ApplicationFilters,
  ApplicationsPayload,
  Criterion,
  HirePayload,
  HireResult,
  Job,
  JobPayload,
  Pipeline,
  Question,
  SavedView,
  Stage,
  Stats,
  Tag,
} from './types';

const enc = encodeURIComponent;

function query(filters: ApplicationFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

async function download(path: string, fallbackName: string) {
  const token = readAuthSession().token;
  const response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(response.status, payload?.error?.message || payload?.message || 'Não foi possível baixar o arquivo.', payload);
  }
  const disposition = response.headers.get('content-disposition') ?? '';
  const encodedName = disposition.match(/filename="([^"]+)"/i)?.[1];
  const filename = encodedName ? decodeURIComponent(encodedName) : fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const jobsApi = {
  list: () => request<Job[]>('/jobs'),
  get: (id: string) => request<Job>(`/jobs/${enc(id)}`),
  create: (payload: JobPayload) => request<Job>('/jobs', { method: 'POST', body: payload }),
  update: (id: string, payload: Partial<JobPayload>) => request<Job>(`/jobs/${enc(id)}`, { method: 'PATCH', body: payload }),
  remove: (id: string) => request<{ deleted: boolean; archived?: boolean }>(`/jobs/${enc(id)}`, { method: 'DELETE' }),
  duplicate: (id: string) => request<Job>(`/jobs/${enc(id)}/duplicate`, { method: 'POST', body: {} }),

  stats: () => request<Stats>('/jobs/stats'),
  talent: (q = '') => request<{ id: string; name: string; email?: string | null; phone?: string | null; status: string; applications: { id: string; jobId: string; status: string; job: { title: string } }[] }[]>(`/jobs/talent${q ? `?q=${enc(q)}` : ''}`),

  pipeline: () => request<Pipeline>('/jobs/pipeline'),
  savePipeline: (stages: Stage[], name?: string) => request<Pipeline>('/jobs/pipeline', { method: 'PUT', body: { name, stages: stages.map(({ id, name, color, kind }) => ({ id, name, color, kind })) } }),

  questions: (jobId: string) => request<(Question & { id: string })[]>(`/jobs/${enc(jobId)}/questions`),
  saveQuestions: (jobId: string, questions: Question[]) => request<(Question & { id: string })[]>(`/jobs/${enc(jobId)}/questions`, { method: 'PUT', body: { questions } }),
  criteria: (jobId: string) => request<(Criterion & { id: string })[]>(`/jobs/${enc(jobId)}/criteria`),
  saveCriteria: (jobId: string, criteria: Criterion[]) => request<(Criterion & { id: string })[]>(`/jobs/${enc(jobId)}/criteria`, { method: 'PUT', body: { criteria } }),

  applications: (jobId: string, filters?: ApplicationFilters) => request<ApplicationsPayload>(`/jobs/${enc(jobId)}/applications${query(filters)}`),
  application: (id: string) => request<ApplicationDetail>(`/jobs/applications/${enc(id)}`),
  move: (id: string, body: { stageId: string; note?: string; rejectionReason?: string }) => request<unknown>(`/jobs/applications/${enc(id)}/stage`, { method: 'PATCH', body }),
  bulk: (body: { ids: string[]; action: 'MOVE' | 'TAG_ADD' | 'TAG_REMOVE' | 'FAVORITE'; stageId?: string; tagId?: string; value?: boolean; rejectionReason?: string }) =>
    request<{ moved?: number; failed?: number; errors?: string[]; updated?: number }>('/jobs/applications/bulk', { method: 'POST', body }),
  favorite: (id: string, favorite: boolean) => request<unknown>(`/jobs/applications/${enc(id)}/favorite`, { method: 'PATCH', body: { favorite } }),
  addNote: (id: string, body: string) => request<unknown>(`/jobs/applications/${enc(id)}/notes`, { method: 'POST', body: { body } }),
  saveEvaluations: (id: string, evaluations: { criterionId: string; score: number; comment?: string }[]) =>
    request<ApplicationDetail>(`/jobs/applications/${enc(id)}/evaluations`, { method: 'PUT', body: { evaluations } }),
  addInterview: (id: string, body: { scheduledAt: string; kind?: string; location?: string; interviewer?: string; notes?: string }) =>
    request<unknown>(`/jobs/applications/${enc(id)}/interviews`, { method: 'POST', body }),
  removeInterview: (id: string, interviewId: string) => request<unknown>(`/jobs/applications/${enc(id)}/interviews/${enc(interviewId)}`, { method: 'DELETE' }),
  setTags: (id: string, tagIds: string[]) => request<unknown>(`/jobs/applications/${enc(id)}/tags`, { method: 'PUT', body: { tagIds } }),
  hire: (applicationId: string, payload: HirePayload) => request<HireResult>(`/jobs/applications/${enc(applicationId)}/hire`, { method: 'POST', body: payload }),

  tags: () => request<Tag[]>('/jobs/tags'),
  createTag: (name: string, color?: string) => request<Tag>('/jobs/tags', { method: 'POST', body: { name, color } }),
  deleteTag: (id: string) => request<unknown>(`/jobs/tags/${enc(id)}`, { method: 'DELETE' }),

  views: () => request<SavedView[]>('/jobs/views'),
  createView: (name: string, filters: ApplicationFilters) => request<SavedView>('/jobs/views', { method: 'POST', body: { name, filters } }),
  deleteView: (id: string) => request<unknown>(`/jobs/views/${enc(id)}`, { method: 'DELETE' }),

  downloadResume: (applicationId: string, name = 'curriculo') => download(`/jobs/applications/${enc(applicationId)}/resume`, name),
  exportCsv: (jobId: string, filters?: ApplicationFilters) => download(`/jobs/${enc(jobId)}/applications/export${query(filters)}`, 'candidatos.csv'),
};
