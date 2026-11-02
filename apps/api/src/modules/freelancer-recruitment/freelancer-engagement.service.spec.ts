import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FreelancerEngagementService } from './freelancer-engagement.service';

const freelancer = { sub: 'u-free', role: 'ADMIN', companyId: 'freela-co' } as any;
const client = { sub: 'u-client', role: 'GESTOR', companyId: 'client-co' } as any;
const outsider = { sub: 'u-out', role: 'ADMIN', companyId: 'other-co' } as any;

function build(overrides: any = {}) {
  const prisma: any = {
    company: { findFirst: vi.fn(async () => ({ id: 'client-co', name: 'Cliente LTDA' })) },
    freelancerEngagement: {
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      create: vi.fn(async (args: any) => ({ id: 'eng-1', ...args.data })),
      update: vi.fn(async (args: any) => ({ id: args.where.id, ...args.data })),
    },
    job: { findFirst: vi.fn(async () => ({ id: 'job-1' })) },
    jobDelegation: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      create: vi.fn(async (args: any) => ({ id: 'del-1', ...args.data })),
      update: vi.fn(async (args: any) => ({ id: args.where.id, ...args.data })),
    },
    jobDelegationGrant: {
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async () => ({ count: 0 })),
    },
    user: { findMany: vi.fn(async () => []) },
    application: { findUnique: vi.fn(async () => ({ id: 'app-1', jobId: 'job-1' })) },
    applicationNote: { create: vi.fn(async (args: any) => ({ id: 'note-1', ...args.data })) },
    $transaction: vi.fn(async (ops: any[]) => Promise.all(ops)),
    ...overrides,
  };
  return { svc: new FreelancerEngagementService(prisma), prisma };
}

describe('FreelancerEngagementService: contrato empresa-a-empresa', () => {
  it('cria contrato pelo CNPJ/CPF do cliente, rejeita CNPJ da propria empresa', async () => {
    const { svc, prisma } = build();
    await svc.create('freela-co', freelancer, { clientCompanyDocument: '12345678000190' } as any);
    expect(prisma.freelancerEngagement.create).toHaveBeenCalledTimes(1);
    expect(prisma.freelancerEngagement.create.mock.calls[0][0].data).toMatchObject({ freelancerCompanyId: 'freela-co', clientCompanyId: 'client-co', status: 'NEGOTIATION' });

    prisma.company.findFirst.mockResolvedValueOnce({ id: 'freela-co', name: 'Propria' });
    await expect(svc.create('freela-co', freelancer, { clientCompanyDocument: '00000000000191' } as any)).rejects.toThrow(BadRequestException);
  });

  it('404 para CNPJ sem empresa cadastrada na plataforma', async () => {
    const { svc, prisma } = build({ company: { findFirst: vi.fn(async () => null) } });
    await expect(svc.create('freela-co', freelancer, { clientCompanyDocument: '12345678000190' } as any)).rejects.toThrow(NotFoundException);
  });

  it('bloqueia novo contrato se ja existe um em negociacao ou ativo com a mesma empresa', async () => {
    const { svc, prisma } = build({ freelancerEngagement: { findUnique: vi.fn(async () => ({ id: 'eng-x', status: 'ACTIVE' })), update: vi.fn(), create: vi.fn() } });
    await expect(svc.create('freela-co', freelancer, { clientCompanyDocument: '12345678000190' } as any)).rejects.toThrow(BadRequestException);
  });

  it('reabre contrato ENDED em vez de duplicar (chave unica por par de empresas)', async () => {
    const { svc, prisma } = build({ freelancerEngagement: { findUnique: vi.fn(async () => ({ id: 'eng-x', status: 'ENDED' })), update: vi.fn(async (a: any) => ({ id: 'eng-x', ...a.data })), create: vi.fn() } });
    const result = await svc.create('freela-co', freelancer, { clientCompanyDocument: '12345678000190' } as any);
    expect(prisma.freelancerEngagement.update).toHaveBeenCalledTimes(1);
    expect(prisma.freelancerEngagement.create).not.toHaveBeenCalled();
    expect((result as any).status).toBe('NEGOTIATION');
  });

  it('so o lado cliente aceita/recusa; terceiro recebe 404 (nao revela existencia do contrato)', async () => {
    const { svc, prisma } = build({ freelancerEngagement: { findUnique: vi.fn(async () => ({ id: 'eng-1', freelancerCompanyId: 'freela-co', clientCompanyId: 'client-co', status: 'NEGOTIATION' })), update: vi.fn(async (a: any) => ({ id: 'eng-1', ...a.data })) } });
    await expect(svc.accept('eng-1', freelancer)).rejects.toThrow(NotFoundException);
    await expect(svc.accept('eng-1', outsider)).rejects.toThrow(NotFoundException);
    const accepted = await svc.accept('eng-1', client);
    expect((accepted as any).status).toBe('ACTIVE');
  });

  it('delegacao de vaga: so o cliente delega vaga PROPRIA e so com contrato ACTIVE', async () => {
    const { svc, prisma } = build({
      freelancerEngagement: { findUnique: vi.fn(async () => ({ id: 'eng-1', freelancerCompanyId: 'freela-co', clientCompanyId: 'client-co', status: 'NEGOTIATION' })) },
    });
    await expect(svc.delegateJob('eng-1', client, { jobId: 'job-1' })).rejects.toThrow(BadRequestException);

    const { svc: svc2, prisma: prisma2 } = build({
      freelancerEngagement: { findUnique: vi.fn(async () => ({ id: 'eng-1', freelancerCompanyId: 'freela-co', clientCompanyId: 'client-co', status: 'ACTIVE' })) },
      job: { findFirst: vi.fn(async () => null) },
    });
    await expect(svc2.delegateJob('eng-1', client, { jobId: 'job-1' })).rejects.toThrow(NotFoundException);
    expect(prisma2.job.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'job-1', companyId: 'client-co' });
  });

  it('nao permite delegar vaga ja delegada (ativa) de novo', async () => {
    const { svc } = build({
      freelancerEngagement: { findUnique: vi.fn(async () => ({ id: 'eng-1', freelancerCompanyId: 'freela-co', clientCompanyId: 'client-co', status: 'ACTIVE' })) },
      jobDelegation: { findUnique: vi.fn(async () => ({ id: 'del-x', status: 'ACTIVE' })), create: vi.fn(), update: vi.fn() },
    });
    await expect(svc.delegateJob('eng-1', client, { jobId: 'job-1' })).rejects.toThrow(BadRequestException);
  });

  it('visibilidade de vagas delegadas: perfil amplo (ADMIN/GESTOR/RH/DEV) ve tudo; demais so com grant', async () => {
    const { svc, prisma } = build();
    await svc.listDelegatedJobs({ sub: 'x', role: 'ADMIN', companyId: 'freela-co' } as any);
    expect(prisma.jobDelegation.findMany.mock.calls[0][0].where).not.toHaveProperty('grants');

    await svc.listDelegatedJobs({ sub: 'u-rec', role: 'FUNCIONARIO', companyId: 'freela-co' } as any);
    expect(prisma.jobDelegation.findMany.mock.calls[1][0].where).toMatchObject({ grants: { some: { userId: 'u-rec' } } });
  });

  it('assertDelegatedJob da 404 quando a vaga nao esta delegada (ativamente) ao freelancer do ator', async () => {
    const { svc } = build({ jobDelegation: { findFirst: vi.fn(async () => null) } });
    await expect(svc.assertDelegatedJob(freelancer, 'job-x')).rejects.toThrow(NotFoundException);
  });

  it('nota em candidatura: so se a vaga da candidatura estiver delegada ao ator', async () => {
    const { svc, prisma } = build({
      jobDelegation: { findFirst: vi.fn(async () => null) },
    });
    await expect(svc.addApplicationNote(freelancer, 'app-1', 'oi')).rejects.toThrow(NotFoundException);

    const { svc: svc2, prisma: prisma2 } = build({
      jobDelegation: { findFirst: vi.fn(async () => ({ id: 'del-1' })) },
    });
    await svc2.addApplicationNote(freelancer, 'app-1', 'Candidato muito bom.');
    expect(prisma2.applicationNote.create.mock.calls[0][0].data).toMatchObject({ applicationId: 'app-1', userId: 'u-free', body: 'Candidato muito bom.' });
  });

  it('grants: so o freelancer dono da delegacao define, e so com usuarios ativos da propria empresa', async () => {
    const { svc, prisma } = build({ jobDelegation: { findFirst: vi.fn(async () => null) } });
    await expect(svc.setDelegationGrants('del-1', freelancer, ['u1'])).rejects.toThrow(NotFoundException);

    const { svc: svc2, prisma: prisma2 } = build({
      jobDelegation: { findFirst: vi.fn(async () => ({ id: 'del-1', freelancerCompanyId: 'freela-co' })) },
      user: { findMany: vi.fn(async () => [{ id: 'u1' }]) },
    });
    await expect(svc2.setDelegationGrants('del-1', freelancer, ['u1', 'u2'])).rejects.toThrow(BadRequestException);
  });
});
