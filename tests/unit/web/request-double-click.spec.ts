import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../apps/web/app/hooks/use-data', () => ({ resetAllQueryStates: () => undefined }));

import { request } from '../../../apps/web/app/lib/api';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('request(): duplo clique em mutações', () => {
  const fetchMock = vi.fn();
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('5 POSTs idênticos simultâneos viram 1 chamada HTTP e todos recebem o mesmo resultado', async () => {
    let release!: () => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { release = () => resolve(jsonResponse({ success: true, data: { id: 'abc' } })); }));
    const calls = Array.from({ length: 5 }, () => request<{ id: string }>('/employees', { method: 'POST', body: { name: 'Ana' } }));
    release();
    const results = await Promise.all(calls);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results).toEqual(Array(5).fill({ id: 'abc' }));
  });

  it('depois de concluir, um novo clique faz uma nova chamada', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ success: true, data: { ok: true } }));
    await request('/vacations', { method: 'POST', body: { a: 1 } });
    await request('/vacations', { method: 'POST', body: { a: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ações diferentes (corpo diferente) não se bloqueiam', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ success: true, data: {} }));
    await Promise.all([
      request('/vacations/1/status', { method: 'PATCH', body: { status: 'APPROVED' } }),
      request('/vacations/1/status', { method: 'PATCH', body: { status: 'REJECTED' } }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('leituras (GET) não são deduplicadas', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ success: true, data: [] }));
    await Promise.all([request('/employees'), request('/employees')]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('erro da API chega a todos os cliques e libera a trava', async () => {
    fetchMock.mockImplementationOnce(async () => jsonResponse({ message: 'CPF já cadastrado' }, 409));
    const first = Array.from({ length: 3 }, () => request('/employees', { method: 'POST', body: { cpf: '1' } }).catch((e) => e));
    const errors = await Promise.all(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const e of errors) expect(e).toMatchObject({ status: 409, message: 'CPF já cadastrado' });
    fetchMock.mockImplementationOnce(async () => jsonResponse({ success: true, data: { id: 'ok' } }));
    await expect(request('/employees', { method: 'POST', body: { cpf: '1' } })).resolves.toEqual({ id: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
