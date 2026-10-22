import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_COOKIE, onConsentChange, openConsentPreferences, onConsentOpen, readConsent, saveConsent } from '../../../apps/web/app/lib/cookie-consent';

function stubBrowser(protocol = 'https:') {
  const jar = new Map<string, string>();
  const target = new EventTarget();
  const doc: any = {};
  Object.defineProperty(doc, 'cookie', {
    get: () => [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
    set: (raw: string) => { const [pair] = raw.split(';'); const [key, ...rest] = pair.split('='); jar.set(key.trim(), rest.join('=')); doc.lastCookie = raw; },
  });
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', {
    location: { protocol },
    dispatchEvent: (event: Event) => target.dispatchEvent(event),
    addEventListener: (name: string, fn: EventListener) => target.addEventListener(name, fn),
    removeEventListener: (name: string, fn: EventListener) => target.removeEventListener(name, fn),
  });
  vi.stubGlobal('CustomEvent', class extends Event { detail: unknown; constructor(name: string, init?: { detail?: unknown }) { super(name); this.detail = init?.detail; } });
  return { doc, jar };
}

afterEach(() => vi.unstubAllGlobals());

describe('cookie-consent', () => {
  let env: ReturnType<typeof stubBrowser>;
  beforeEach(() => { env = stubBrowser(); });

  it('comeca sem escolha', () => {
    expect(readConsent()).toBeNull();
  });

  it.each(['accepted', 'declined'] as const)('guarda e le a escolha %s', (choice) => {
    saveConsent(choice);
    expect(readConsent()).toBe(choice);
    expect(env.jar.get(CONSENT_COOKIE)).toBe(choice);
  });

  it('o cookie dura 180 dias, e de sessao do site, SameSite=Lax e Secure em https', () => {
    saveConsent('accepted');
    expect(env.doc.lastCookie).toContain(`Max-Age=${180 * 86_400}`);
    expect(env.doc.lastCookie).toContain('Path=/');
    expect(env.doc.lastCookie).toContain('SameSite=Lax');
    expect(env.doc.lastCookie).toContain('Secure');
  });

  it('sem Secure em http local', () => {
    env = stubBrowser('http:');
    saveConsent('declined');
    expect(env.doc.lastCookie).not.toContain('Secure');
  });

  it('ignora valor desconhecido no cookie', () => {
    env.jar.set(CONSENT_COOKIE, 'qualquer-coisa');
    expect(readConsent()).toBeNull();
  });

  it('avisa quem escuta quando a escolha muda e permite reabrir o aviso', () => {
    const changes: string[] = [];
    const stop = onConsentChange((choice) => changes.push(choice));
    saveConsent('accepted');
    saveConsent('declined');
    stop();
    saveConsent('accepted');
    expect(changes).toEqual(['accepted', 'declined']);

    const opened = vi.fn();
    onConsentOpen(opened);
    openConsentPreferences();
    expect(opened).toHaveBeenCalledTimes(1);
  });
});
