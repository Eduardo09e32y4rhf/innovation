export type ConsentChoice = 'accepted' | 'declined';

export const CONSENT_COOKIE = 'innovation_cookie_consent';
const CONSENT_DAYS = 180;
const CHANGE_EVENT = 'innovation:consent-change';
const OPEN_EVENT = 'innovation:consent-open';

/** Le a escolha do visitante. Cookie proprio de preferencia, necessario para lembrar a resposta. */
export function readConsent(): ConsentChoice | null {
  try {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.split('; ').find((item) => item.startsWith(`${CONSENT_COOKIE}=`));
    const value = match?.slice(CONSENT_COOKIE.length + 1);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: ConsentChoice): void {
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${CONSENT_DAYS * 86_400}; Path=/; SameSite=Lax${secure}`;
    window.dispatchEvent(new CustomEvent<ConsentChoice>(CHANGE_EVENT, { detail: choice }));
  } catch {
    // sem cookies disponiveis: a escolha vale so ate fechar a pagina
  }
}

export function onConsentChange(listener: (choice: ConsentChoice) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<ConsentChoice>).detail);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

/** Reabre o aviso (link "Preferencias de cookies" no rodape). */
export function openConsentPreferences(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onConsentOpen(listener: () => void): () => void {
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}
