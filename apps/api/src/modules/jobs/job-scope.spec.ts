import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JobScopeService, jobScopeWhere } from './job-scope.service';
import { JobsController } from './jobs.controller';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

const rs = { sub: 'rs-1', role: 'RH_RS' };

function build(overrides: any = {}) {
  const prisma: any = {
    job: { findFirst: vi.fn(async () => ({ id: 'j1' })) },
    application: { findFirst: vi.fn(async () => ({ id: 'a1' })) },
    user: { findMany: vi.fn(async () => []) },
    jobRecruiter: { create: vi.fn(async () => ({})), findMany: vi.fn(async () => []), deleteMany: vi.fn(() => 'del'), createMany: vi.fn(() => 'cr') },
    $transaction: vi.fn(async () => []),
    ...overrides,
  };
  return { svc: new JobScopeService(prisma), prisma };
}

describe('escopo por vaga (RH_RS)', () => {
  it('so RH_RS e filtrado: vaga sem responsavel ou onde e responsavel', () => {
    expect(jobScopeWhere({ sub: 'x', role: 'ADMIN' })).toEqual({});
    expect(jobScopeWhere({ sub: 'x', role: 'RH' })).toEqual({});
    expect(jobScopeWhere(rs)).toEqual({ OR: [{ recruiters: { none: {} } }, { recruiters: { some: { userId: 'rs-1' } } }] });
  });

  it('assertJob e assertApplication consultam por empresa + escopo e dao 404 quando nada volta', async () => {
    const { svc, prisma } = build();
    await svc.assertJob('c1', rs, 'j1');
    expect(prisma.job.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'j1', companyId: 'c1', OR: expect.any(Array) });
    await svc.assertApplication('c1', rs, 'a1');
    expect(prisma.application.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'a1', companyId: 'c1', job: { is: { companyId: 'c1', OR: expect.any(Array) } } });
    prisma.job.findFirst.mockResolvedValueOnce(null);
    await expect(svc.assertJob('c1', rs, 'outra')).rejects.toThrow(NotFoundException);
    prisma.application.findFirst.mockResolvedValueOnce(null);
    await expect(svc.assertApplication('c1', rs, 'x')).rejects.toThrow(NotFoundException);
  });

  it('criador RH_RS vira responsavel; ADMIN criando nao', async () => {
    const { svc, prisma } = build();
    await svc.assignCreator('c1', rs, 'j9');
    expect(prisma.jobRecruiter.create).toHaveBeenCalledWith({ data: { companyId: 'c1', jobId: 'j9', userId: 'rs-1', assignedById: 'rs-1' } });
    await svc.assignCreator('c1', { sub: 'a', role: 'ADMIN' }, 'j9');
    expect(prisma.jobRecruiter.create).toHaveBeenCalledTimes(1);
  });

  it('setRecruiters rejeita usuario fora da empresa/perfil e aceita usuarios validos', async () => {
    const { svc, prisma } = build();
    prisma.user.findMany.mockResolvedValueOnce([{ id: 'u1' }]);
    await expect(svc.setRecruiters('c1', { sub: 'adm', role: 'ADMIN' }, 'j1', ['u1', 'u2'])).rejects.toThrow(BadRequestException);
    expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({ companyId: 'c1', isActive: true });
    prisma.user.findMany.mockResolvedValueOnce([{ id: 'u1' }, { id: 'u2' }]);
    await svc.setRecruiters('c1', { sub: 'adm', role: 'ADMIN' }, 'j1', ['u1', 'u2', 'u1']);
    expect(prisma.jobRecruiter.createMany.mock.calls[0][0].data).toHaveLength(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('RH_RS nao ve nem altera responsaveis', () => {
    for (const h of ['recruiters', 'assignRecruiters']) {
      const roles: string[] = Reflect.getMetadata(ROLES_KEY, (JobsController.prototype as any)[h]);
      expect(roles).toEqual(['DEV', 'ADMIN', 'RH']);
    }
  });

  it('lista elegivel: so usuarios ativos da propria empresa com perfil RH ou RH_RS; rota fechada ao RH_RS', async () => {
    const { svc, prisma } = build();
    await svc.eligibleRecruiters('c1');
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ companyId: 'c1', isActive: true, role: { in: ['RH_RS', 'RH'] } });
    expect(prisma.user.findMany.mock.calls[0][0].select).toEqual({ id: true, name: true, role: true });
    const roles: string[] = Reflect.getMetadata(ROLES_KEY, (JobsController.prototype as any).eligibleRecruiters);
    expect(roles).toEqual(['DEV', 'ADMIN', 'RH']);
  });
});