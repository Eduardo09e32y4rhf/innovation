import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { JobsService } from './jobs.service';
import { JobsRepository } from './jobs.repository';

// RS-C-12: candidatura sem prova de posse do e-mail nao sobrescreve cadastro existente e nao revela que o e-mail ja se candidatou.
const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
const FIELDS = { name: 'Intruso Silva', email: 'maria@x.com', phone: '11988887777', consent: 'true' };

function build(repoApply: any) {
  const repository: any = {
    jobForApplication: vi.fn(async () => ({ id: 'job-1', companyId: 'co-1', questions: [], screeningMinScore: null, screeningAction: null })),
    apply: vi.fn(repoApply),
  };
  const storage: any = { save: vi.fn(), remove: vi.fn() };
  const recruitment: any = { evaluateApplication: vi.fn(async () => ({ scored: false, score: 0, knockedOut: false, reason: null, reject: false })) };
  const privacy: any = { afterApply: vi.fn(), notifyDuplicateApply: vi.fn(async () => undefined) };
  const service = new JobsService(repository, storage, recruitment, privacy, {} as any, {} as any, { assertClean: vi.fn() } as any);
  return { service, repository, storage, privacy };
}

describe('RS-C-12: candidatura publica e cadastro existente', () => {
  it('sem prova de posse, o repositorio recebe ownerVerified=false (nao sobrescreve nome/telefone)', async () => {
    const { service, repository } = build(async () => ({ duplicate: false, application: { id: 'app-1' } }));
    await service.apply('job-1', { ...FIELDS }, { buffer: PDF, filename: 'cv.pdf' });
    expect(repository.apply.mock.calls[0][2]).toMatchObject({ ownerVerified: false, email: 'maria@x.com' });
  });

  it('conta verificada (mesmo e-mail) pode atualizar o cadastro', async () => {
    const { service, repository } = build(async () => ({ duplicate: false, application: { id: 'app-1' } }));
    await service.apply('job-1', { ...FIELDS }, { buffer: PDF, filename: 'cv.pdf' }, { ownerVerified: true });
    expect(repository.apply.mock.calls[0][2]).toMatchObject({ ownerVerified: true });
  });

  it('duplicada e anonima: responde igual a uma candidatura nova (sem 409) e avisa o dono do e-mail', async () => {
    const { service, storage, privacy } = build(async () => ({ duplicate: true, application: { id: 'app-old' } }));
    const result = await service.apply('job-1', { ...FIELDS }, { buffer: PDF, filename: 'cv.pdf' });
    expect(result).toEqual({ received: true });
    expect(JSON.stringify(result)).not.toContain('app-old');
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(privacy.notifyDuplicateApply).toHaveBeenCalledWith('app-old');
    expect(privacy.afterApply).not.toHaveBeenCalled();
  });

  it('resposta de candidatura nova tem o mesmo formato da duplicada', async () => {
    const { service } = build(async () => ({ duplicate: false, application: { id: 'app-1' } }));
    expect(await service.apply('job-1', { ...FIELDS }, { buffer: PDF, filename: 'cv.pdf' })).toEqual({ received: true });
  });

  it('duplicada com dono verificado continua dando 409 claro', async () => {
    const { service } = build(async () => ({ duplicate: true, application: { id: 'app-old' } }));
    await expect(service.apply('job-1', { ...FIELDS }, { buffer: PDF, filename: 'cv.pdf' }, { ownerVerified: true })).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('RS-C-12: repositorio nao sobrescreve cadastro existente sem prova de posse', () => {
  function repo(existing: any) {
    const candidateUpdate = vi.fn(async ({ data }: any) => ({ ...existing, ...data }));
    const applicationCreate = vi.fn(async ({ data }: any) => ({ id: 'app-new', ...data }));
    const tx: any = {
      $executeRaw: vi.fn(),
      job: { findFirst: vi.fn(async () => ({ pipelineId: null })) },
      candidate: { findFirst: vi.fn(async () => existing), update: candidateUpdate, updateMany: vi.fn() },
      application: { findFirst: vi.fn(async () => null), create: applicationCreate },
      hiringPipeline: { findFirst: vi.fn(async () => null) },
      pipelineStage: { findMany: vi.fn(async () => []) },
    };
    const prisma: any = { $transaction: async (fn: any) => fn(tx) };
    return { repository: new JobsRepository(prisma), candidateUpdate, applicationCreate };
  }
  const existing = { id: 'cand-1', name: 'Maria Souza', phone: '11911112222', linkedinUrl: null, email: 'maria@x.com' };
  const input = { name: 'Intruso Silva', email: 'maria@x.com', phone: '11988887777', linkedinUrl: 'https://linkedin.com/in/x', consent: true };
  const resume = { key: 'k', name: 'cv.pdf', type: 'application/pdf', size: 10 };
  const extra = { answers: [], score: null, knockedOut: false, knockoutReason: null, rejectOnKnockout: false };

  it('sem posse: mantem nome e telefone, so completa vazios e registra a divergencia para o RH', async () => {
    const { repository, candidateUpdate, applicationCreate } = repo(existing);
    await repository.apply('co-1', 'job-1', { ...input, ownerVerified: false }, resume, extra);
    const data = candidateUpdate.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('name');
    expect(data.phone).toBe('11911112222');
    expect(data.linkedinUrl).toBe('https://linkedin.com/in/x');
    const events = applicationCreate.mock.calls[0][0].data.events.create;
    expect(events.some((e: any) => e.type === 'DATA_MISMATCH' && /diferem do cadastro/.test(e.note))).toBe(true);
  });

  it('com posse verificada: atualiza nome e telefone', async () => {
    const { repository, candidateUpdate } = repo(existing);
    await repository.apply('co-1', 'job-1', { ...input, ownerVerified: true }, resume, extra);
    expect(candidateUpdate.mock.calls[0][0].data).toMatchObject({ name: 'Intruso Silva', phone: '11988887777' });
  });
});
