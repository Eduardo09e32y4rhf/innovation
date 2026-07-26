import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const apiSource = readFileSync(new URL('../../apps/web/app/lib/api.ts', import.meta.url), 'utf8');
const compactSource = apiSource.replace(/\s+/g, ' ');

describe('Support API contract', () => {
  it('keeps the client support route aligned with the backend path', () => {
    expect(compactSource).toContain("list: (status?: string) => request<any[]>(`/support/tickets${status ? `?status=${status}` : ''}`)");
  });

  it('keeps the platform support assignment route aligned with the backend path', () => {
    expect(compactSource).toContain("assign: (id: string, userId?: string) => request<any>(`/platform/support/tickets/${id}/assign`, { method: 'PATCH', body: { userId } })");
  });

  it('keeps the public support route aligned with the backend path', () => {
    expect(compactSource).toContain("createTicket: (data: any) => request<{ success: boolean; message: string; ticketNumber: string }>('/support/public/tickets', { method: 'POST', body: data })");
  });
});
