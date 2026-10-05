import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { canManageRole, assertRoleChangeAllowed } from '../../common/constants/role-hierarchy';
import { JobsController } from './jobs.controller';
import { RecruitmentController } from './recruitment.controller';
import { UsersController } from '../users/users.controller';

function guardAllows(ctrl: any, handler: string, role: string) {
  const guard = new RolesGuard({ getAllAndOverride: (_k: string, [h, c]: any[]) => Reflect.getMetadata(ROLES_KEY, h) ?? Reflect.getMetadata(ROLES_KEY, c) } as any);
  const ctx: any = {
    getHandler: () => ctrl.prototype[handler],
    getClass: () => ctrl,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  };
  try { return guard.canActivate(ctx); } catch { return false; }
}

describe('RH_RS (recrutamento e selecao)', () => {
  it.each([
    [JobsController, 'list'], [JobsController, 'get'], [JobsController, 'create'], [JobsController, 'resume'],
    [RecruitmentController, 'applications'], [RecruitmentController, 'move'], [RecruitmentController, 'interview'],
  ])('acessa %s.%s', (c, h) => expect(guardAllows(c, h as string, 'RH_RS')).toBe(true));

  it.each([
    [JobsController, 'hire'], [RecruitmentController, 'talent'], [RecruitmentController, 'bulk'],
    [RecruitmentController, 'savePipeline'], [RecruitmentController, 'deleteTag'],
  ])('nao acessa %s.%s', (c, h) => expect(guardAllows(c, h as string, 'RH_RS')).toBe(false));

  it('nao acessa gestao de usuarios', () => {
    for (const h of ['list', 'create', 'usage', 'linkable']) expect(guardAllows(UsersController, h, 'RH_RS')).toBe(false);
  });

  it('RH_RS e perfil pessoal podem usar ping', () => expect(guardAllows(UsersController, 'ping', 'RH_RS')).toBe(true));

  it('RH, ADMIN, CEO e DEV podem atribuir RH_RS; RH_RS nao pode gerir usuarios', () => {
    for (const a of ['DEV', 'CEO', 'ADMIN']) expect(canManageRole(a, 'RH_RS')).toBe(true);
    expect(canManageRole('RH', 'RH_RS')).toBe(true);
    for (const a of ['RH_RS', 'GESTOR', 'COMERCIAL', 'CONTABIL']) expect(canManageRole(a, 'RH_RS')).toBe(false);
    expect(() => assertRoleChangeAllowed('RH', 'RH_RS')).not.toThrow();
    expect(() => assertRoleChangeAllowed('RH_RS', 'RH_RS')).toThrow();
    expect(() => assertRoleChangeAllowed('ADMIN', 'RH_RS')).not.toThrow();
  });
});
