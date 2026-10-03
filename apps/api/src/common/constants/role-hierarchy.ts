import { ForbiddenException } from '@nestjs/common';

export const ROLE_MANAGEMENT: Record<string, string[]> = {
  DEV: ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  CEO: ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  CONTABIL: [],
  COMERCIAL: [],
  ADMIN: ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  RH: ['RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  GESTOR: [],
  FUNCIONARIO: [],
  CONSULTA: [],
};

export function canManageRole(actorRole?: string, targetRole?: string): boolean {
  if (!actorRole || !targetRole) return false;
  return ROLE_MANAGEMENT[actorRole.toUpperCase()]?.includes(targetRole.toUpperCase()) ?? false;
}

export function assertRoleChangeAllowed(actorRole?: string, nextRole?: string) {
  if (!nextRole) return;
  const protectedRoles = ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL'];

  if (protectedRoles.includes(nextRole) && actorRole !== 'DEV') {
    throw new ForbiddenException('Apenas um perfil DEV pode criar ou promover perfis internos (CEO, Contábil, etc).');
  }
  if (actorRole === 'RH' && ['ADMIN', 'DEV', 'CEO', 'CONTABIL', 'COMERCIAL'].includes(nextRole)) {
    throw new ForbiddenException('RH não pode criar ou promover Administrador, Comercial ou Perfis Internos.');
  }
  if (actorRole === 'GESTOR' || actorRole === 'FUNCIONARIO' || actorRole === 'CONSULTA') {
    throw new ForbiddenException('Seu perfil não tem permissão para alterar ou criar usuários.');
  }
}
