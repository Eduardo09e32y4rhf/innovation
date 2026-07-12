/**
 * auth-session.ts
 *
 * Camada única de persistência de sessão de autenticação.
 *
 * Regras de ouro:
 *  - Sessão ativa SEMPRE em localStorage para persistir entre abas.
 *  - Serialização de User/Company acontece AQUI, nunca no chamador.
 */

import type { User, Company } from '@/app/contexts/AuthContext';

export interface StoredAuthSession {
  token: string | null;
  user: string | null;       // JSON serializado internamente
  company: string | null;    // JSON serializado internamente
  passwordChangeRequired: string | null;
}

export interface AuthScopeSnapshot {
  token: string | null;
  userId: string | null;
  companyId: string | null;
  role: string | null;
}

// ─── Chaves de armazenamento ──────────────────────────────────────────────────

const SESSION_KEYS = {
  token: 'auth.token',
  user: 'auth.user',
  company: 'auth.company',
  passwordChangeRequired: 'auth.passwordChangeRequired',
} as const;

/**
 * Todas as chaves que já foram ou poderiam ser usadas para auth em localStorage.
 * O guard remove qualquer uma delas que apareça lá.
 */
const PROHIBITED_LOCALSTORAGE_KEYS: readonly string[] = [
  'token',
  'user',
  'company',
  'passwordChangeRequired',
  'auth.token',
  'auth.user',
  'auth.company',
  'auth.passwordChangeRequired',
  'accessToken',
  'refreshToken',
  'role',
  'companyId',
  'tenant',
  'selectedCompany',
];

// ─── Auth Scope (store externo para useSyncExternalStore) ─────────────────────

let authScopeSnapshot: AuthScopeSnapshot = {
  token: null,
  userId: null,
  companyId: null,
  role: null,
};

const listeners = new Set<() => void>();

export function setAuthScopeSnapshot(next: AuthScopeSnapshot): void {
  authScopeSnapshot = next;
  listeners.forEach((l) => l());
}

export function getAuthScopeSnapshot(): AuthScopeSnapshot {
  return authScopeSnapshot;
}

export function subscribeAuthScope(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function hasValue(v: string | null): boolean {
  return Boolean(v && v !== 'undefined' && v !== 'null');
}

function safeParse<T>(v: string | null): T | null {
  if (!hasValue(v)) return null;
  try { return JSON.parse(v!) as T; } catch { return null; }
}

function _writeToStorage(session: StoredAuthSession, isolateTab: boolean = false): void {
  try {
    const storage = isolateTab ? window.sessionStorage : window.localStorage;
    const entries: Array<[string, string | null]> = [
      [SESSION_KEYS.token, session.token],
      [SESSION_KEYS.user, session.user],
      [SESSION_KEYS.company, session.company],
      [SESSION_KEYS.passwordChangeRequired, session.passwordChangeRequired],
    ];
    entries.forEach(([key, value]) => {
      if (value === null || value === undefined) {
        storage.removeItem(key);
      } else {
        storage.setItem(key, value);
      }
    });
  } catch (e) {
    // Ignora
  }
}

function _purgeLocalStorage(): void {
  // Empty function to keep compatibility if called
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Lê a sessão priorizando sessionStorage (abas isoladas como Ghost Mode), depois localStorage.
 */
export function readAuthSession(): StoredAuthSession {
  if (typeof window === 'undefined') {
    return { token: null, user: null, company: null, passwordChangeRequired: null };
  }

  let current: StoredAuthSession = { token: null, user: null, company: null, passwordChangeRequired: null };

  try {
    const ss = window.sessionStorage;
    const ls = window.localStorage;
    current = {
      token: ss.getItem(SESSION_KEYS.token) ?? ss.getItem('token') ?? ss.getItem('auth.token') ?? ls.getItem(SESSION_KEYS.token) ?? ls.getItem('token') ?? ls.getItem('auth.token'),
      user: ss.getItem(SESSION_KEYS.user) ?? ss.getItem('user') ?? ss.getItem('auth.user') ?? ls.getItem(SESSION_KEYS.user) ?? ls.getItem('user') ?? ls.getItem('auth.user'),
      company: ss.getItem(SESSION_KEYS.company) ?? ss.getItem('company') ?? ss.getItem('auth.company') ?? ls.getItem(SESSION_KEYS.company) ?? ls.getItem('company') ?? ls.getItem('auth.company'),
      passwordChangeRequired: ss.getItem(SESSION_KEYS.passwordChangeRequired) ?? ss.getItem('passwordChangeRequired') ?? ss.getItem('auth.passwordChangeRequired') ?? ls.getItem(SESSION_KEYS.passwordChangeRequired) ?? ls.getItem('passwordChangeRequired') ?? ls.getItem('auth.passwordChangeRequired'),
    };
  } catch (e) {
    // Ignora SecurityError caso cookies/storage bloqueados
  }

  return current;
}

/**
 * Lê a sessão já deserializada — sem necessidade de safeParse no chamador.
 */
export function readParsedAuthSession(): {
  token: string | null;
  user: User | null;
  company: Company | null;
  passwordChangeRequired: boolean;
  isIsolatedTab: boolean;
} {
  const raw = readAuthSession();
  
  // Verifica se o token veio do sessionStorage ou localStorage
  let isIsolated = false;
  if (typeof window !== 'undefined') {
    const ssToken = window.sessionStorage.getItem(SESSION_KEYS.token) ?? window.sessionStorage.getItem('token') ?? window.sessionStorage.getItem('auth.token');
    isIsolated = Boolean(ssToken && raw.token === ssToken);
  }

  return {
    token: raw.token,
    user: safeParse<User>(raw.user),
    company: safeParse<Company>(raw.company),
    passwordChangeRequired: raw.passwordChangeRequired === 'true',
    isIsolatedTab: isIsolated,
  };
}

/**
 * Persiste a sessão no localStorage com objetos brutos.
 * A serialização JSON acontece aqui — nunca no chamador.
 */
export function persistAuthSession(
  token: string,
  user: User,
  company: Company,
  passwordChangeRequired: boolean,
  isolateTab: boolean = false
): void {
  if (typeof window === 'undefined') return;
  _writeToStorage({
    token,
    user: JSON.stringify(user),
    company: JSON.stringify(company),
    passwordChangeRequired: String(passwordChangeRequired),
  }, isolateTab);
}

/** Remove todos os dados de sessão do localStorage ou sessionStorage. */
export function clearAuthSession(isIsolatedTab: boolean = false): void {
  if (typeof window === 'undefined') return;
  try {
    const storage = isIsolatedTab ? window.sessionStorage : window.localStorage;
    Object.values(SESSION_KEYS).forEach((k) => storage.removeItem(k));
    PROHIBITED_LOCALSTORAGE_KEYS.forEach((k) => storage.removeItem(k));
  } catch (e) {
    // Ignora
  }
}

/**
 * Stub para o guard de localStorage por aba.
 * Como agora usamos localStorage, o guard original foi desativado.
 */
export function startLocalStorageGuard(): () => void {
  return () => undefined;
}
