import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../apps/web/app/lib/api', () => ({ API_URL: '/api' }));
const consent = vi.hoisted(() => ({ value: 'accepted' as 'accepted' | 'declined' | null }));
vi.mock('../../../apps/web/app/lib/cookie-consent', () => ({ readConsent: () => consent.value }));

import { trackVisit } from '../../../apps/web/app/lib/track-visit';

function stubBrowser(options: { dnt?: string | null; gpc?: boolean; referrer?: string; host?: string } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('window', { location: { host: options.host ?? 'innovation.test', pathname: '/' } });
  vi.stubGlobal('navigator', { doNotTrack: options.dnt ?? null, globalPrivacyControl: options.gpc });
  vi.stubGlobal('document', { referrer: options.referrer ?? '' });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => { vi.unstubAllGlobals(); consent.value = 'accepted'; });

describe('trackVisit', () => {
  let fetchMock: ReturnType<typeof stubBrowser>;
  beforeEach(() => { fetchMock = stubBrowser(); });

  it('envia so o caminho, sem cookies', () => {
    trackVisit('/');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/public/visits');
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', keepalive: true });
    expect(JSON.parse(init.body)).toEqual({ path: '/', consent: true });
  });

  it('envia o site de origem quando vem de outro dominio', () => {
    fetchMock = stubBrowser({ referrer: 'https://www.google.com/search?q=rh' });
    trackVisit('/');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ path: '/', consent: true, referrer: 'www.google.com' });
  });

  it('nao envia origem quando e o proprio site', () => {
    fetchMock = stubBrowser({ referrer: 'https://innovation.test/planos' });
    trackVisit('/');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ path: '/', consent: true });
  });

  it.each([null, 'declined'] as const)('nao envia nada sem aceite (escolha: %s)', (choice) => {
    consent.value = choice;
    trackVisit('/');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('respeita "nao rastrear" e Global Privacy Control', () => {
    fetchMock = stubBrowser({ dnt: '1' });
    trackVisit('/');
    fetchMock = stubBrowser({ gpc: true });
    trackVisit('/');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('nunca lanca, mesmo se a rede falhar ou o ambiente nao for navegador', async () => {
    fetchMock = stubBrowser();
    fetchMock.mockRejectedValue(new Error('offline'));
    expect(() => trackVisit('/')).not.toThrow();
    vi.unstubAllGlobals();
    expect(() => trackVisit('/')).not.toThrow();
  });
});
