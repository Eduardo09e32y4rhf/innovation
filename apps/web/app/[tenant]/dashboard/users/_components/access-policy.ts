import type { AppUser, UserRole } from '@/app/lib/api';

// Mirrors UsersController and UsersService; custom permissions never bypass roles.
export const USER_ROLES: UserRole[] = ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
const COMPANY_ROLES: UserRole[] = ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
export function availableUserRoles(role?: string): UserRole[] {
  if (role === 'DEV') return USER_ROLES;
  if (role === 'RH') return COMPANY_ROLES.filter(value => value !== 'ADMIN');
  return ['ADMIN', 'CEO'].includes(role ?? '') ? COMPANY_ROLES : [];
}
export function userAccessPolicy(role: string | undefined, actorId: string | undefined, target: AppUser) {
  const manageable = availableUserRoles(role).includes(target.role);
  const own = actorId === target.id;
  const readable = !!role && (role === 'DEV' || !['DEV', 'CEO', 'CONTABIL', 'COMERCIAL'].includes(target.role) || own);
  return {
    read: readable,
    download: readable && (['DEV', 'ADMIN', 'RH'].includes(role ?? '') || own),
    edit: manageable && readable,
    permissions: manageable && readable && !own,
    block: manageable && readable && !own,
    reset: manageable && !own && ['DEV', 'ADMIN', 'RH'].includes(role ?? ''),
    delete: manageable && readable && !own && ['DEV', 'ADMIN', 'RH'].includes(role ?? ''),
    own,
  };
}
