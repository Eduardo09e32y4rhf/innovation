import { ForbiddenException } from '@nestjs/common';
import { canManageRole } from '../../common/constants/role-hierarchy';
import { isOwnerTargetedByOther } from '../../common/constants/platform-owner';
import type { JwtUser, UserRole } from '../../common/types/auth.types';

const ACCESS_ROLES: UserRole[] = ['FUNCIONARIO', 'GESTOR', 'RH', 'ADMIN', 'CONSULTA'];

/** Shared by interactive registration and import confirmation; jobs must also supply their authenticated actor. */
export function assertEmployeeWriter(actor: JwtUser) {
  if (!actor?.sub || !['DEV', 'ADMIN', 'RH'].includes(actor.role)) {
    throw new ForbiddenException('Seu perfil não pode cadastrar ou editar funcionários.');
  }
}

export function employeeAccessRole(actor: JwtUser, requested?: string | null): UserRole {
  const role = requested || 'FUNCIONARIO';
  if (!ACCESS_ROLES.includes(role as UserRole) || !canManageRole(actor?.role, role)) {
    throw new ForbiddenException('Seu perfil não pode atribuir este acesso.');
  }
  return role as UserRole;
}

export function assertEmployeeUserManageable(actor: JwtUser, target: { id?: string; email?: string | null; role?: string } | null | undefined) {
  if (!target?.role || isOwnerTargetedByOther(actor, target) || !canManageRole(actor?.role, target.role)) {
    throw new ForbiddenException('Seu perfil não pode gerir o acesso deste usuário.');
  }
}
