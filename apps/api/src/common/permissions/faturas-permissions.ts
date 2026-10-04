import type { UserRole } from '../types/auth.types';

export const FATURAS_PERMISSIONS = [
  'faturas.ver',
  'faturas.pagar',
  'faturas.nf_anexar',
  'faturas.cobrar',
  'faturas.desconto',
  'faturas.reembolsar',
  'faturas.todas_empresas',
] as const;

export type FaturasPermission = (typeof FATURAS_PERMISSIONS)[number];

/** Espelha DEFAULT_PERMISSIONS de apps/web/app/lib/permissions.ts. */
const DEFAULTS: Partial<Record<UserRole, readonly FaturasPermission[]>> = {
  ADMIN: ['faturas.ver', 'faturas.pagar'],
  RH: ['faturas.ver', 'faturas.pagar'],
  DEV: FATURAS_PERMISSIONS,
  CEO: FATURAS_PERMISSIONS,
  CONTABIL: ['faturas.ver', 'faturas.nf_anexar', 'faturas.todas_empresas'],
  COMERCIAL: ['faturas.ver', 'faturas.todas_empresas'],
};

/** Mesma regra do front: permissões personalizadas, quando existem, substituem o padrão do perfil. */
export function userHasFaturasPermission(
  user: { role?: UserRole; customPermissions?: unknown } | undefined,
  permission: FaturasPermission,
): boolean {
  if (!user?.role) return false;
  if (user.role === 'DEV') return true;
  const custom = user.customPermissions;
  if (Array.isArray(custom) && custom.length > 0) return custom.includes(permission);
  return (DEFAULTS[user.role] ?? []).includes(permission);
}
