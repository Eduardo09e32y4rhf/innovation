'use client';

let pending: Promise<any> | null = null;

/** Uma renovação por aba; Web Locks serializa cookies compartilhados entre abas. */
export function refreshSession(apiUrl: string): Promise<any> {
  if (pending) return pending;
  const renew = async () => {
    const response = await fetch(`${apiUrl}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!response.ok) throw new Error('Sessão expirada. Entre novamente.');
    const payload = await response.json();
    return payload.data ?? payload;
  };
  pending = (typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('innovation-auth-refresh', renew)
    : renew()).finally(() => { pending = null; });
  return pending;
}
