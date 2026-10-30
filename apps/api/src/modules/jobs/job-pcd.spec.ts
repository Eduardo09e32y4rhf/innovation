import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsRepository } from './jobs.repository';
import { pcdQuota } from './pcd-quota';
import { RecruitmentMetricsService } from './recruitment-metrics.service';

describe('RS-R-11 cota de PCD (Lei 8.213/91, art. 93)', () => {
  it.each([
    [99, 0, 0], [100, 0, 2], [200, 0, 4], [201, 0, 7], [500, 0, 15], [501, 0, 21], [1000, 0, 40], [1001, 0, 51], [2500, 0, 125],
  ])('%i empregados exigem %i/%i', (employees, _filled, required) => {
    expect(pcdQuota(employees, 0).required).toBe(required);
  });
  it('abaixo de 100 empregados a cota nao se aplica', () => {
    expect(pcdQuota(80, 0)).toMatchObject({ applies: false, percent: 0, required: 0, missing: 0 });
  });
  it('calcula o que falta e o percentual atingido', () => {
    expect(pcdQuota(300, 4)).toMatchObject({ applies: true, percent: 3, required: 9, filled: 4, missing: 5, met: false });
    expect(pcdQuota(300, 9)).toMatchObject({ missing: 0, met: true });
    expect(pcdQuota(300, 12).missing).toBe(0);
  });
});

describe('RS-R-11 vaga PCD como atributo', () => {
  it('o DTO aceita a flag pcd e recusa texto', async () => {
    const ok = plainToInstance(CreateJobDto, { title: 'Dev', description: 'x', pcd: true });
    expect(await validate(ok, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    const bad = plainToInstance(CreateJobDto, { title: 'Dev', description: 'x', pcd: 'sim' });
    expect(await validate(bad, { whitelist: true, forbidNonWhitelisted: true })).not.toHaveLength(0);
  });
  it('as consultas publicas selecionam pcd', async () => {
    const findMany = vi.fn(async () => []);
    const repo = new JobsRepository({ job: { findMany, findFirst: vi.fn(async () => null) }, company: { findMany: vi.fn(async () => []) } } as any);
    await repo.publicJobsCatalog();
    expect((findMany.mock.calls[0] as any)[0].select.pcd).toBe(true);
    await repo.publicJobs('c1');
    expect((findMany.mock.calls[1] as any)[0].select.pcd).toBe(true);
  });
});

describe('RS-R-11 indicador de cota na tela de metricas', () => {
  it('cruza empregados ativos, contratados PCD declarados e vagas PCD abertas', async () => {
    const prisma: any = {
      pipelineStage: { findMany: vi.fn(async () => []) },
      application: { findMany: vi.fn(async ({ where }: any) => (where.status === 'HIRED' ? [{ id: 'h1' }, { id: 'h2' }] : [])) },
      job: { findMany: vi.fn(async () => []), count: vi.fn(async () => 2) },
      candidateDiversity: { findMany: vi.fn(async () => []), count: vi.fn(async () => 4) },
      employee: { count: vi.fn(async () => 300) },
      user: { findMany: vi.fn(async () => []) },
    };
    const result: any = await new RecruitmentMetricsService(prisma).metrics('c1', {}, {});
    expect(prisma.employee.count).toHaveBeenCalledWith({ where: { companyId: 'c1', status: { in: ['ACTIVE', 'ONBOARDING'] } } });
    expect(result.pcd.quota).toMatchObject({ applies: true, percent: 3, required: 9, filled: 4, missing: 5 });
    expect(result.pcd.openPcdJobs).toBe(2);
  });
});
