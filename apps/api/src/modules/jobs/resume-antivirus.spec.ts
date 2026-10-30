import { ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

// RS-C-03 / RS-D-13: curriculo da candidatura publica e da conta passa pelo antivirus antes de ser gravado.
vi.mock('../../database/prisma.service', () => ({ PrismaService: class {} }));
vi.mock('../mail/mail.service', () => ({ MailService: class {} }));
vi.mock('./jobs-storage.service', () => ({ JobsStorageService: class {} }));
vi.mock('./jobs.service', async (original) => ({ ...(await original<any>()) }));
import { CandidateAccountService } from './candidate-account.service';
import { JobsService as RealJobsService } from './jobs.service';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');

function accountService(scanner: any) {
  const prisma: any = { candidateAccount: { update: vi.fn(async ({ data }: any) => ({ id: 'acc-1', email: 'c@x.com', ...data })) } };
  const storage: any = { save: vi.fn(), remove: vi.fn(), read: vi.fn() };
  const svc = new CandidateAccountService(prisma, {} as any, storage, {} as any, scanner);
  return { svc, prisma, storage };
}

describe('RS-C-03/RS-D-13: antivirus no curriculo da conta', () => {
  const env = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = env; });

  it('arquivo infectado e recusado e nada e gravado', async () => {
    const scanner = { assertClean: vi.fn(async () => { throw new UnprocessableEntityException('O arquivo foi recusado pela verificacao de seguranca.'); }) };
    const { svc, prisma, storage } = accountService(scanner);
    await expect(svc.saveResume({ id: 'acc-1', email: 'c@x.com', resumeKey: null } as any, { buffer: PDF, filename: 'cv.pdf' })).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(scanner.assertClean).toHaveBeenCalledWith(PDF);
    expect(storage.save).not.toHaveBeenCalled();
    expect(prisma.candidateAccount.update).not.toHaveBeenCalled();
  });

  it('scanner indisponivel em producao bloqueia (fail-closed)', async () => {
    const scanner = { assertClean: vi.fn(async () => { throw new ServiceUnavailableException('indisponivel'); }) };
    const { svc, storage } = accountService(scanner);
    await expect(svc.saveResume({ id: 'acc-1', email: 'c@x.com' } as any, { buffer: PDF, filename: 'cv.pdf' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('em producao, sem scanner injetado, tambem bloqueia', async () => {
    process.env.NODE_ENV = 'production';
    const { svc, storage } = accountService(undefined);
    await expect(svc.saveResume({ id: 'acc-1', email: 'c@x.com' } as any, { buffer: PDF, filename: 'cv.pdf' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('arquivo limpo e gravado', async () => {
    const scanner = { assertClean: vi.fn(async () => undefined) };
    const { svc, storage } = accountService(scanner);
    await svc.saveResume({ id: 'acc-1', email: 'c@x.com', resumeKey: null } as any, { buffer: PDF, filename: 'cv.pdf' });
    expect(storage.save).toHaveBeenCalledTimes(1);
  });

  it('candidatura publica: arquivo infectado e recusado antes de consultar a vaga ou gravar', async () => {
    const scanner = { assertClean: vi.fn(async () => { throw new UnprocessableEntityException('recusado'); }) };
    const repository: any = { jobForApplication: vi.fn(), apply: vi.fn() };
    const storage: any = { save: vi.fn(), remove: vi.fn() };
    const jobs = new RealJobsService(repository, storage, {} as any, {} as any, {} as any, {} as any, scanner as any);
    await expect(jobs.apply('job-1', { name: 'Ana', email: 'ana@x.com', phone: '11999999999', consent: 'true' }, { buffer: PDF, filename: 'cv.pdf' })).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(storage.save).not.toHaveBeenCalled();
    expect(repository.jobForApplication).not.toHaveBeenCalled();
  });
});
