import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AnyAuthenticated } from '../decorators/any-authenticated.decorator';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

class Ctl { withRoles() {} anyLogged() {} open() {} forgotten() {} emptyRoles() {} }
const mark = (name: keyof Ctl, decorator: MethodDecorator) => decorator(Ctl.prototype, name, Object.getOwnPropertyDescriptor(Ctl.prototype, name)!);
mark('withRoles', Roles('RH'));
mark('anyLogged', AnyAuthenticated());
mark('open', Public());
mark('emptyRoles', Roles());
const ctx = (handler: Function, user: any) => ({
  getHandler: () => handler, getClass: () => Ctl,
  switchToHttp: () => ({ getRequest: () => ({ user }) }),
}) as any;
const guard = new RolesGuard(new Reflector());
const run = (name: keyof Ctl, user: any) => { try { return guard.canActivate(ctx(Ctl.prototype[name] as any, user)); } catch (e: any) { return e.getStatus?.() ?? 'erro'; } };

describe('SEG-09 camada 2: RolesGuard nega por padrao', () => {
  it('@Roles continua valendo (papel certo passa, errado 403, DEV passa)', () => {
    expect(run('withRoles', { role: 'RH' })).toBe(true);
    expect(run('withRoles', { role: 'GESTOR' })).toBe(403);
    expect(run('withRoles', { role: 'DEV' })).toBe(true);
  });
  it('@AnyAuthenticated libera qualquer papel logado, mas nao anonimo', () => {
    expect(run('anyLogged', { role: 'FUNCIONARIO' })).toBe(true);
    expect(run('anyLogged', undefined)).toBe(401);
  });
  it('@Public libera', () => { expect(run('open', undefined)).toBe(true); });
  it('rota sem nenhuma marca (ou @Roles() vazio) = 403, ate para usuario logado', () => {
    expect(run('forgotten', { role: 'ADMIN' })).toBe(403);
    expect(run('emptyRoles', { role: 'ADMIN' })).toBe(403);
  });
});
