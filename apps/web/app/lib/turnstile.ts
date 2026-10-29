/**
 * Cloudflare Turnstile (captcha gratuito). So fica ativo quando NEXT_PUBLIC_TURNSTILE_SITE_KEY existe no build;
 * sem ela nada e carregado nem enviado e os formularios funcionam como antes.
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
export const TURNSTILE_HEADER = 'x-turnstile-token';

/** Rotas POST protegidas na API (login, cadastro de empresa, esqueci-senha, conta de candidato e candidatura publica). */
const PROTECTED_PATHS = [
  /^\/auth\/(login|register-company|password-reset\/request)$/,
  /^\/candidate-portal\/auth\/(register|login|forgot-password)$/,
  /^\/public\/jobs\/[^/]+\/apply$/,
  /^\/public\/internal-jobs\/[^/]+\/apply$/,
];

let token = '';
let resetWidget: (() => void) | null = null;

export function setTurnstileToken(value: string) { token = value; }
export function registerTurnstileReset(fn: (() => void) | null) { resetWidget = fn; }

/** Renova o desafio (o token da Cloudflare vale para uma unica validacao). */
export function resetTurnstile() { token = ''; try { resetWidget?.(); } catch { /* widget ja removido */ } }

export function isTurnstileProtected(method: string | undefined, path: string): boolean {
  return (method ?? 'GET').toUpperCase() === 'POST' && PROTECTED_PATHS.some((re) => re.test(path.split('?')[0]));
}

/** Headers extras para a requisicao. Consome o token e ja pede um novo desafio, entao nao precisa resetar apos erro. */
export function turnstileHeaders(method: string | undefined, path: string): Record<string, string> {
  if (!TURNSTILE_SITE_KEY || !token || !isTurnstileProtected(method, path)) return {};
  const current = token;
  resetTurnstile();
  return { [TURNSTILE_HEADER]: current };
}
