/**
 * auth-session.ts
 *
 * Camada única de persistência de sessão de autenticação.
 *
 * Regras de ouro:
 *  - Sessão ativa SEMPRE em sessionStorage (isolada por aba).
 *  - localStorage é ZONA PROIBIDA para auth — startLocalStorageGuard() elimina
 *    qualquer chave de auth que apareça lá, inclusive escritas de outras abas.
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

function _writeToSessionStorage(session: StoredAuthSession): void {
  try {
    const ss = window.sessionStorage;
    const entries: Array<[string, string | null]> = [
      [SESSION_KEYS.token, session.token],
      [SESSION_KEYS.user, session.user],
      [SESSION_KEYS.company, session.company],
      [SESSION_KEYS.passwordChangeRequired, session.passwordChangeRequired],
    ];
    entries.forEach(([key, value]) => {
      if (value === null || value === undefined) {
        ss.removeItem(key);
      } else {
        ss.setItem(key, value);
      }
    });
  } catch (e) {
    // Ignora
  }
}

function _purgeLocalStorage(): void {
  try {
    const ls = window.localStorage;
    PROHIBITED_LOCALSTORAGE_KEYS.forEach((k) => ls.removeItem(k));
  } catch (e) {
    // Ignora SecurityError
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Lê a sessão do sessionStorage (isolada por aba).
 * Se não existir, migra silenciosamente do localStorage legado e o limpa.
 */
export function readAuthSession(): StoredAuthSession {
  if (typeof window === 'undefined') {
    return { token: null, user: null, company: null, passwordChangeRequired: null };
  }

  let current: StoredAuthSession = { token: null, user: null, company: null, passwordChangeRequired: null };

  try {
    const ss = window.sessionStorage;
    current = {
      token: ss.getItem(SESSION_KEYS.token),
      user: ss.getItem(SESSION_KEYS.user),
      company: ss.getItem(SESSION_KEYS.company),
      passwordChangeRequired: ss.getItem(SESSION_KEYS.passwordChangeRequired),
    };
  } catch (e) {
    // Ignora SecurityError caso cookies/storage bloqueados
  }

  if (hasValue(current.token) || hasValue(current.user)) {
    return current;
  }

  // Migração: chaves legadas do localStorage → sessionStorage
  try {
    const ls = window.localStorage;
    const legacyToken = ls.getItem('token') ?? ls.getItem('auth.token');
    const legacyUser = ls.getItem('user') ?? ls.getItem('auth.user');
    const legacyCompany = ls.getItem('company') ?? ls.getItem('auth.company');
    const legacyPcr = ls.getItem('passwordChangeRequired') ?? ls.getItem('auth.passwordChangeRequired');

    if (hasValue(legacyToken) || hasValue(legacyUser)) {
      const migrated: StoredAuthSession = {
        token: legacyToken,
        user: legacyUser,
        company: legacyCompany,
        passwordChangeRequired: legacyPcr,
      };
      _writeToSessionStorage(migrated);
      _purgeLocalStorage();
      return migrated;
    }
  } catch (e) {
    // Ignora erros de SecurityError caso o browser bloqueie localStorage
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
} {
  const raw = readAuthSession();
  return {
    token: raw.token,
    user: safeParse<User>(raw.user),
    company: safeParse<Company>(raw.company),
    passwordChangeRequired: raw.passwordChangeRequired === 'true',
  };
}

/**
 * Persiste a sessão no sessionStorage com objetos brutos.
 * A serialização JSON acontece aqui — nunca no chamador.
 * Garante que o localStorage esteja limpo após cada escrita.
 */
export function persistAuthSession(
  token: string,
  user: User,
  company: Company,
  passwordChangeRequired: boolean,
): void {
  if (typeof window === 'undefined') return;
  _writeToSessionStorage({
    token,
    user: JSON.stringify(user),
    company: JSON.stringify(company),
    passwordChangeRequired: String(passwordChangeRequired),
  });
  _purgeLocalStorage();
}

/** Remove todos os dados de sessão do sessionStorage e do localStorage. */
export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    const ss = window.sessionStorage;
    Object.values(SESSION_KEYS).forEach((k) => ss.removeItem(k));
  } catch (e) {
    // Ignora
  }
  _purgeLocalStorage();
}

/**
 * Ativa o guard de localStorage por aba — chamar UMA VEZ no AuthProvider.
 *
 * O evento `storage` é disparado pelo browser quando OUTRA aba escreve no
 * localStorage. Este listener elimina imediatamente qualquer chave de auth
 * proibida, tornando o localStorage uma zona inerte para sessão de usuário.
 *
 * Retorna uma função de cleanup para usar em useEffect.
 */
export function startLocalStorageGuard(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  // Limpeza imediata ao montar (resíduos de sessões anteriores)
  _purgeLocalStorage();

  const handler = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage) return;
    if (!event.key) return;
    if (PROHIBITED_LOCALSTORAGE_KEYS.includes(event.key)) {
      window.localStorage.removeItem(event.key);
    }
  };

  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
