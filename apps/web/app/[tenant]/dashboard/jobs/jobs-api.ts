import { API_URL, ApiError, request } from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';

import type {
  ApplicationStatus,
  HireResult,
  Job,
  JobApplication,
  JobPayload,
} from './types';

type CollectionResponse<T> =
  | T[]
  | {
      items?: T[];
      results?: T[];
      jobs?: T[];
      applications?: T[];
    };

function collection<T>(payload: CollectionResponse<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.items ?? payload.results ?? payload.jobs ?? payload.applications ?? [];
}

export const jobsApi = {
  async list(): Promise<Job[]> {
    return collection(await request<CollectionResponse<Job>>('/jobs'));
  },

  create(payload: JobPayload) {
    return request<Job>('/jobs', { method: 'POST', body: payload });
  },

  update(id: string, payload: Partial<JobPayload>) {
    return request<Job>(`/jobs/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload });
  },

  remove(id: string) {
    return request<void>(`/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async applications(jobId: string): Promise<JobApplication[]> {
    const payload = await request<CollectionResponse<JobApplication>>(
      `/jobs/${encodeURIComponent(jobId)}/applications`,
    );
    return collection(payload);
  },

  updateApplicationStatus(applicationId: string, status: ApplicationStatus) {
    return request<JobApplication>(
      `/jobs/applications/${encodeURIComponent(applicationId)}/status`,
      { method: 'PATCH', body: { status: status === 'REVIEWING' ? 'SCREENING' : status } },
    );
  },

  hire(applicationId: string) {
    return request<HireResult>(
      `/jobs/applications/${encodeURIComponent(applicationId)}/hire`,
      { method: 'POST', body: {} },
    );
  },

  async downloadResume(applicationId: string, fallbackName = 'curriculo') {
    const token = readAuthSession().token;
    const response = await fetch(
      `${API_URL}/jobs/applications/${encodeURIComponent(applicationId)}/resume`,
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiError(
        response.status,
        payload?.message || 'Não foi possível baixar o currículo.',
        payload,
      );
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
  },
};
