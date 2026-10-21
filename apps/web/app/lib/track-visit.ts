import { API_URL } from './api';
import { readConsent } from './cookie-consent';

/**
 * Conta uma visita na landing page, SOMENTE se o visitante aceitou no aviso de cookies.
 * Nao cria cookie de rastreio: so envia o caminho e, se vier de outro site, o endereco do site de origem.
 * Respeita tambem "Nao rastrear" (DNT) e Global Privacy Control. Nunca lanca erro.
 */
export function trackVisit(path?: string): void {
  try {
    if (typeof window === 'undefined') return;
    if (readConsent() !== 'accepted') return;
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === '1' || nav.globalPrivacyControl) return;

    let referrer: string | undefined;
    if (document.referrer) {
      const origin = new URL(document.referrer);
      if (origin.host !== window.location.host) referrer = origin.host;
    }

    void fetch(`${API_URL}/public/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path ?? window.location.pathname, consent: true, ...(referrer ? { referrer } : {}) }),
      keepalive: true,
      credentials: 'omit',
    }).catch(() => undefined);
  } catch {
    // estatistica nunca pode atrapalhar a pagina
  }
}
