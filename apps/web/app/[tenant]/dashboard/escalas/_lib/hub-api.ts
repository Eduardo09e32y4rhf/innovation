import { API_URL, ApiError, request } from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';
import type {
  Approvals, CalendarPayload, DayDetail, Finding, Geofence, Indicators, Overview, Person, PunchPolicy, PunchResult, PunchToday,
  RequestType, ScheduleRequestItem, ScheduleTemplate, Timesheet,
} from './types';

const enc = encodeURIComponent;

function qs(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : '';
}

export interface RequestInput {
  type: RequestType;
  payload: Record<string, unknown>;
  reason?: string;
  peerEmployeeId?: string;
}

export const hubApi = {
  overview: () => request<Overview>('/escalas/overview'),
  calendar: (month: string, scope: string, department?: string) => request<CalendarPayload>(`/escalas/calendar${qs({ month, scope, department })}`),
  day: (employeeId: string, date: string) => request<DayDetail>(`/escalas/day${qs({ employeeId, date })}`),
  timesheet: (month: string, employeeId?: string) => request<Timesheet>(`/escalas/timesheet${qs({ month, employeeId })}`),
  approvals: () => request<Approvals>('/escalas/approvals'),
  reports: (month: string) => request<{ indicators: Indicators; rows: { employeeId: string; name: string; department: string; position: string; days: number; worked: number; balance: number; late: number; overtime50: number; overtime100: number; night: number; bank: number }[] }>(`/escalas/reports${qs({ month })}`),
  peers: () => request<{ id: string; name: string }[]>('/escalas/peers'),
  people: () => request<Person[]>('/escalas/people'),

  punchToday: () => request<PunchToday>('/escalas/punch/today'),
  punch: (body: { latitude?: number; longitude?: number; accuracyMeters?: number; justification?: string; deviceId?: string }) => request<PunchResult>('/escalas/punch', { method: 'POST', body }),

  policy: () => request<PunchPolicy>('/escalas/policy'),
  savePolicy: (body: Partial<PunchPolicy>) => request<PunchPolicy>('/escalas/policy', { method: 'PUT', body }),
  geofences: () => request<Geofence[]>('/escalas/geofences'),
  createGeofence: (body: Omit<Geofence, 'id'>) => request<Geofence>('/escalas/geofences', { method: 'POST', body }),
  updateGeofence: (id: string, body: Omit<Geofence, 'id'>) => request<Geofence>(`/escalas/geofences/${enc(id)}`, { method: 'PUT', body }),
  deleteGeofence: (id: string) => request<unknown>(`/escalas/geofences/${enc(id)}`, { method: 'DELETE' }),

  previewRequest: (body: RequestInput) => request<{ ok: boolean; findings: Finding[] }>('/escalas/requests/preview', { method: 'POST', body }),
  createRequest: (body: RequestInput) => request<{ id: string; warnings: Finding[] }>('/escalas/requests', { method: 'POST', body }),
  requests: (view?: 'mine' | 'approvals', status?: string) => request<ScheduleRequestItem[]>(`/escalas/requests${qs({ view, status })}`),
  decide: (id: string, action: 'APPROVE' | 'REJECT', note?: string) => request<{ status: string }>(`/escalas/requests/${enc(id)}/decide`, { method: 'POST', body: { action, note } }),
  bulkDecide: (ids: string[], action: 'APPROVE' | 'REJECT', note?: string) => request<{ approved: number; failed: number; results: { id: string; ok: boolean; message?: string }[] }>('/escalas/requests/bulk-decide', { method: 'POST', body: { ids, action, note } }),
  respondPeer: (id: string, action: 'ACCEPT' | 'DECLINE', note?: string) => request<{ status: string }>(`/escalas/requests/${enc(id)}/peer`, { method: 'POST', body: { action, note } }),
  cancelRequest: (id: string) => request<unknown>(`/escalas/requests/${enc(id)}/cancel`, { method: 'POST', body: {} }),

  createOverride: (body: { employeeId: string; date: string; type: string; altEntry?: string; altExit?: string; reason: string }) => request<unknown>('/escalas/overrides', { method: 'POST', body }),
  removeOverride: (id: string) => request<unknown>(`/escalas/overrides/${enc(id)}`, { method: 'DELETE' }),
  assignPreview: (body: { employeeIds: string[]; scheduleId: string; startDate: string; endDate?: string }) => request<any>('/escalas/assign/preview', { method: 'POST', body }),
  assign: (body: { employeeIds: string[]; scheduleId: string; startDate: string; endDate?: string }) => request<any>('/escalas/assign', { method: 'POST', body }),

  schedules: () => request<ScheduleTemplate[]>('/schedules'),
  createSchedule: (body: Record<string, unknown>) => request<ScheduleTemplate>('/schedules', { method: 'POST', body }),
  updateSchedule: (id: string, body: Record<string, unknown>) => request<ScheduleTemplate>(`/schedules/${enc(id)}`, { method: 'PATCH', body }),
  archiveSchedule: (id: string) => request<unknown>(`/schedules/${enc(id)}/archive`, { method: 'PATCH', body: {} }),

  timeRules: () => request<any[]>('/time-rules'),
  saveTimeRule: (id: string | null, body: Record<string, unknown>) => (id ? request<any>(`/time-rules/${enc(id)}`, { method: 'PUT', body }) : request<any>('/time-rules', { method: 'POST', body })),

  approveManualTrack: (id: string, approved: boolean) => request<unknown>(`/time-track/${enc(id)}/approve`, { method: 'PATCH', body: { approved } }),
  approveOvertime: (id: string, approved: boolean) => request<unknown>(`/time-track/${enc(id)}/overtime-approval`, { method: 'PATCH', body: { approved } }),

  async download(path: string, fallbackName: string) {
    const token = readAuthSession().token;
    const response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiError(response.status, payload?.error?.message || payload?.message || 'Não foi possível baixar o arquivo.', payload);
    }
    const disposition = response.headers.get('content-disposition') ?? '';
    const name = disposition.match(/filename="([^"]+)"/i)?.[1];
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name ? decodeURIComponent(name) : fallbackName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
  exportReport: (month: string) => hubApi.download(`/escalas/reports/export${qs({ month })}`, `escalas-${month}.csv`),
};
