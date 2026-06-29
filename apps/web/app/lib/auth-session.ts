export interface StoredAuthSession {
  token: string | null;
  user: string | null;
  company: string | null;
  passwordChangeRequired: string | null;
}

export interface AuthScopeSnapshot {
  token: string | null;
  userId: string | null;
  companyId: string | null;
  role: string | null;
}

const STORAGE_KEYS = {
  token: 'auth.token',
  user: 'auth.user',
  company: 'auth.company',
  passwordChangeRequired: 'auth.passwordChangeRequired',
} as const;

const LEGACY_KEYS = {
  token: 'token',
  user: 'user',
  company: 'company',
  passwordChangeRequired: 'passwordChangeRequired',
} as const;

let authScopeSnapshot: AuthScopeSnapshot = {
  token: null,
  userId: null,
  companyId: null,
  role: null,
};

const listeners = new Set<() => void>();

function hasStorageValue(value: string | null) {
  return Boolean(value && value !== 'undefined' && value !== 'null');
}

function readFromStorage(storage: Storage, keys: Record<keyof StoredAuthSession, string>): StoredAuthSession {
  return {
    token: storage.getItem(keys.token),
    user: storage.getItem(keys.user),
    company: storage.getItem(keys.company),
    passwordChangeRequired: storage.getItem(keys.passwordChangeRequired),
  };
}

function writeToStorage(storage: Storage, keys: Record<keyof StoredAuthSession, string>, session: StoredAuthSession) {
  const entries = Object.entries(session) as Array<[keyof StoredAuthSession, string | null]>;
  entries.forEach(([field, value]) => {
    const key = keys[field];
    if (value === null || value === undefined) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, value);
    }
  });
}

function clearStorage(storage: Storage, keys: Record<keyof StoredAuthSession, string>) {
  Object.values(keys).forEach((key) => storage.removeItem(key));
}

function getStorageKeys() {
  return {
    session: STORAGE_KEYS,
    legacy: LEGACY_KEYS,
  };
}

export function readAuthSession(): StoredAuthSession {
  if (typeof window === 'undefined') {
    return { token: null, user: null, company: null, passwordChangeRequired: null };
  }

  const { session, legacy } = getStorageKeys();
  const current = readFromStorage(window.sessionStorage, session);
  if (hasStorageValue(current.token) || hasStorageValue(current.user) || hasStorageValue(current.company)) {
    return current;
  }

  const legacySession = readFromStorage(window.localStorage, legacy);
  if (hasStorageValue(legacySession.token) || hasStorageValue(legacySession.user) || hasStorageValue(legacySession.company)) {
    writeToStorage(window.sessionStorage, session, legacySession);
    clearStorage(window.localStorage, legacy);
    return legacySession;
  }

  return current;
}

export function persistAuthSession(session: StoredAuthSession) {
  if (typeof window === 'undefined') return;
  const { session: sessionKeys, legacy } = getStorageKeys();
  writeToStorage(window.sessionStorage, sessionKeys, session);
  clearStorage(window.localStorage, legacy);
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  const { session, legacy } = getStorageKeys();
  clearStorage(window.sessionStorage, session);
  clearStorage(window.localStorage, legacy);
}

export function setAuthScopeSnapshot(next: AuthScopeSnapshot) {
  authScopeSnapshot = next;
  listeners.forEach((listener) => listener());
}

export function getAuthScopeSnapshot() {
  return authScopeSnapshot;
}

export function subscribeAuthScope(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
