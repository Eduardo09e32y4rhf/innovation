/** Canonical API role, with compatibility for older persisted sessions. */
export function resolveUserRole(user: { role?: string | null; profile?: string | null } | null | undefined): string {
  return String(user?.role || user?.profile || '').trim().toUpperCase();
}
