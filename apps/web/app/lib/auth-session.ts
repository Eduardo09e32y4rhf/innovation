/**
 * auth-session.ts
 *
 * Camada única de persistência de sessão de autenticação.
 *
 * Regras de ouro:
 *  - Access token somente em memória; o refresh token fica no cookie httpOnly do backend.
 *  - Serialização de User/Company acontece AQUI, nunca no chamador.
 */

import type { User, Company } from '@/app/contexts/AuthContext';

export interface StoredAuthSession {
  token: string | null;
  user: string | null;       // JSON serializado internamente
  company: string | null;    // JSON serializado internamente
  passwordChangeRequired: string | null;
  ghostMode: string | null;
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
  ghostMode: 'auth.ghostMode',
} as const;

// O access token não é persistido: fica apenas em memória nesta aba.
let memoryToken: string | null = null;

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
    memoryToken = session.token;
    // Migra instalações antigas: nenhum access token permanece no Web Storage.
    window.localStorage.removeItem(SESSION_KEYS.token);
    window.sessionStorage.removeItem(SESSION_KEYS.token);
    const entries: Array<[string, string | null]> = [
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
 * Lê o access token em memória e os metadados da sessão no storage apropriado.
 */
export function readAuthSession(): StoredAuthSession {
  if (typeof window === 'undefined') {
    return { token: null, user: null, company: null, passwordChangeRequired: null, ghostMode: null };
  }

  let current: StoredAuthSession = { token: null, user: null, company: null, passwordChangeRequired: null, ghostMode: null };

  try {
    const ss = window.sessionStorage;
    const ls = window.localStorage;
    const useGhost = ss.getItem(SESSION_KEYS.ghostMode) === 'true';
    const storage = useGhost ? ss : ls;
    current = {
      token: memoryToken,
      user: storage.getItem(SESSION_KEYS.user),
      company: storage.getItem(SESSION_KEYS.company),
      passwordChangeRequired: storage.getItem(SESSION_KEYS.passwordChangeRequired),
      ghostMode: useGhost ? 'true' : 'false',
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
    isIsolated = raw.ghostMode === 'true';
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
    ghostMode: String(isolateTab),
  }, isolateTab);
}

/** Remove todos os dados de sessão do localStorage ou sessionStorage. */
export function clearAuthSession(isIsolatedTab: boolean = false): void {
  if (typeof window === 'undefined') return;
  memoryToken = null;
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
