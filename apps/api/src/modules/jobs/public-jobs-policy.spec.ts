import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { JobsRepository } from './jobs.repository';

function repoWith(prisma: any) {
  return new JobsRepository(prisma);
}

describe('vagas publicas: politica unica e allowlist', () => {
  const prisma: any = {
    job: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => null) },
    company: { findMany: vi.fn(async () => []) },
  };
  const expectedCompany = {
    isActive: true,
    status: 'ACTIVE',
    billingStatus: { notIn: ['CANCELED', 'PENDING_PAYMENT'] },
    activeModules: { has: 'recruitment' },
  };

  it('catalogo, vagas da empresa, detalhe, candidatura e home usam a mesma condicao de disponibilidade', async () => {
    const r = repoWith(prisma);
    await r.publicJobsCatalog();
    await r.publicJobs('c1');
    await r.publicJob('c1', 'j1');
    await r.publicJobById('j1');
    await r.jobForApplication('j1');
    await r.allPublicJobs();
    const wheres = [
      ...prisma.job.findMany.mock.calls.map((c: any[]) => c[0].where),
      ...prisma.job.findFirst.mock.calls.map((c: any[]) => c[0].where),
    ];
    expect(wheres).toHaveLength(6);
    for (const w of wheres) {
      expect(w.status).toBe('OPEN');
      expect(w.company).toEqual(expectedCompany);
      expect(w.OR).toBeDefined();
    }
  });

  it('detalhe publico usa select (sem include) e nao expoe campos internos nem criterios', async () => {
    prisma.job.findFirst.mockClear();
    await repoWith(prisma).publicJobById('j1');
    const args = prisma.job.findFirst.mock.calls[0][0];
    expect(args.include).toBeUndefined();
    expect(args.select.pipelineId).toBeUndefined();
    expect(args.select.status).toBeUndefined();
    expect(args.select.questions.select.knockout).toBeUndefined();
    expect(args.select.questions.select.scoreRule).toBeUndefined();
  });

  it('criterios so existem na leitura interna da candidatura', async () => {
    prisma.job.findFirst.mockClear();
    await repoWith(prisma).jobForApplication('j1');
    const q = prisma.job.findFirst.mock.calls[0][0].select.questions.select;
    expect(q.knockout).toBe(true);
    expect(q.scoreRule).toBe(true);
  });
});

describe('candidatura: revalida a vaga dentro da transacao', () => {
  it('vaga encerrada em corrida nao registra candidato nem candidatura', async () => {
    const tx: any = {
      $executeRaw: vi.fn(async () => 1),
      job: { findFirst: vi.fn(async () => null) },
      candidate: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      application: { create: vi.fn(), findFirst: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (fn: any) => fn(tx)) };
    const repo = repoWith(prisma);
    await expect(
      repo.apply('c1', 'j1', { email: 'a@x.com', name: 'A' }, { key: 'k', name: 'n', type: 'application/pdf', size: 1 }, { answers: [], score: 0, knockedOut: false, knockoutReason: null, rejectOnKnockout: false }),
    ).rejects.toThrow(NotFoundException);
    expect(tx.candidate.create).not.toHaveBeenCalled();
    expect(tx.application.create).not.toHaveBeenCalled();
    expect(tx.job.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'j1', companyId: 'c1', status: 'OPEN' });
  });

  it('rejeicao automatica numa vaga nao reverte candidato ja contratado', async () => {
    const tx: any = {
      $executeRaw: vi.fn(async () => 1),
      job: { findFirst: vi.fn(async () => ({ pipelineId: 'p1' })) },
      hiringPipeline: { findFirst: vi.fn(async () => ({ id: 'p1' })) },
      pipelineStage: { findMany: vi.fn(async () => [{ id: 's1', kind: 'APPLIED', name: 'Novo' }, { id: 's2', kind: 'REJECTED', name: 'Rejeitado' }]) },
      candidate: { findFirst: vi.fn(async () => ({ id: 'cand', status: 'HIRED', linkedinUrl: null })), create: vi.fn(), update: vi.fn(async (a: any) => ({ id: 'cand', ...a })), updateMany: vi.fn(async () => ({ count: 0 })) },
      application: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({ id: 'app' })) },
    };
    const prisma: any = { $transaction: vi.fn(async (fn: any) => fn(tx)) };
    await repoWith(prisma).apply('c1', 'j1', { email: 'a@x.com', name: 'A' }, { key: 'k', name: 'n', type: 'application/pdf', size: 1 }, { answers: [], score: 0, knockedOut: true, knockoutReason: 'x', rejectOnKnockout: true });
    expect(tx.candidate.update.mock.calls[0][0].data.status).toBeUndefined();
    expect(tx.candidate.updateMany.mock.calls[0][0].where).toEqual({ id: 'cand', status: { not: 'HIRED' } });
  });
});