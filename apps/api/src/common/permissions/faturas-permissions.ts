import type { UserRole } from '../types/auth.types';

export const FATURAS_PERMISSIONS = [
  'faturas.ver',
  'faturas.pagar',
  'faturas.nf_anexar',
  'faturas.cobrar',
  'faturas.desconto',
  'faturas.reembolsar',
  'faturas.todas_empresas',
  'faturas.plano',
] as const;

export type FaturasPermission = (typeof FATURAS_PERMISSIONS)[number];

export const FATURAS_ROLES: readonly UserRole[] = ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];

/** Espelha DEFAULT_PERMISSIONS de apps/web/app/lib/permissions.ts. */
export const FATURAS_DEFAULTS: Partial<Record<UserRole, readonly FaturasPermission[]>> = {
  ADMIN: ['faturas.ver', 'faturas.pagar', 'faturas.plano'],
  RH: ['faturas.ver', 'faturas.pagar'],
  DEV: FATURAS_PERMISSIONS,
  CEO: FATURAS_PERMISSIONS,
  CONTABIL: ['faturas.ver', 'faturas.nf_anexar', 'faturas.todas_empresas'],
  COMERCIAL: ['faturas.ver', 'faturas.todas_empresas'],
};

export const isFaturasPermission = (value: string): value is FaturasPermission => (FATURAS_PERMISSIONS as readonly string[]).includes(value);

/**
 * Ordem de precedência (igual no front):
 * 1. DEV sempre pode tudo;
 * 2. permissões personalizadas do usuário, quando existem, substituem todo o resto;
 * 3. permissões do perfil definidas pelo DEV na tela de Permissões (roleOverride);
 * 4. padrão do perfil.
 */
export function userHasFaturasPermission(
  user: { role?: UserRole; customPermissions?: unknown } | undefined,
  permission: FaturasPermission,
  roleOverride?: readonly string[] | null,
): boolean {
  if (!user?.role) return false;
  if (user.role === 'DEV') return true;
  const custom = user.customPermissions;
  if (Array.isArray(custom) && custom.length > 0) return custom.includes(permission);
  if (roleOverride) return roleOverride.includes(permission);
  return (FATURAS_DEFAULTS[user.role] ?? []).includes(permission);
}
