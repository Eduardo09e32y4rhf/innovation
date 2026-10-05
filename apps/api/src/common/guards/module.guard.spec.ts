import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequireModule } from '../decorators/require-module.decorator';
import { ModuleGuard } from './module.guard';
import { JobsController } from '../../modules/jobs/jobs.controller';
import { RecruitmentController } from '../../modules/jobs/recruitment.controller';

function ctx(ctrl: any, handler: string, user: any) {
  return { getHandler: () => ctrl.prototype[handler], getClass: () => ctrl, switchToHttp: () => ({ getRequest: () => ({ user }) }) } as any;
}
function guardWith(modules: string[] | null) {
  const prisma: any = { company: { findUnique: vi.fn(async () => (modules ? { activeModules: modules } : null)) } };
  return new ModuleGuard(new Reflector(), prisma);
}

describe('ModuleGuard (recruitment)', () => {
  it('empresa com o modulo acessa Vagas; sem o modulo ou sem empresa e negada', async () => {
    for (const c of [JobsController, RecruitmentController]) {
      expect(await guardWith(['employees', 'recruitment']).canActivate(ctx(c, 'list' in c.prototype ? 'list' : 'stats', { role: 'RH_RS', companyId: 'c1' }))).toBe(true);
      await expect(guardWith(['employees']).canActivate(ctx(c, 'list' in c.prototype ? 'list' : 'stats', { role: 'RH', companyId: 'c1' }))).rejects.toThrow(ForbiddenException);
      await expect(guardWith(null).canActivate(ctx(c, 'list' in c.prototype ? 'list' : 'stats', { role: 'ADMIN', companyId: 'c1' }))).rejects.toThrow(ForbiddenException);
    }
  });

  it('DEV nao e limitado pelo plano; rota sem modulo declarado passa', async () => {
    expect(await guardWith(['employees']).canActivate(ctx(JobsController, 'list', { role: 'DEV', companyId: 'c1' }))).toBe(true);
    class Plain { x() {} }
    expect(await guardWith([]).canActivate(ctx(Plain, 'x', { role: 'ADMIN', companyId: 'c1' }))).toBe(true);
    class Other { y() {} }
    RequireModule('management')(Other.prototype, 'y', Object.getOwnPropertyDescriptor(Other.prototype, 'y')!);
    await expect(guardWith(['recruitment']).canActivate(ctx(Other, 'y', { role: 'ADMIN', companyId: 'c1' }))).rejects.toThrow(ForbiddenException);
  });
});