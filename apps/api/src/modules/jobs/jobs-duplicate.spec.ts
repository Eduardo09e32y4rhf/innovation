import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { JobsService } from './jobs.service';

const future = new Date(Date.now() + 20 * 86_400_000);
const past = new Date(Date.now() - 5 * 86_400_000);

function setup(job: Record<string, unknown>) {
  const repository: any = {
    monthlyJobQuota: vi.fn(async () => null),
    find: vi.fn(async () => ({ id: 'j1', title: 'Dev', description: 'd', status: 'OPEN', openings: 2, interviewGuide: [], _count: { applications: 4 }, ...job })),
    create: vi.fn(async (_c: string, data: any) => ({ id: 'copy1', ...data })),
    copyRecruiters: vi.fn(async () => 2),
    audit: vi.fn(async () => ({})),
  };
  const recruitment: any = { getQuestions: vi.fn(async () => []), getCriteria: vi.fn(async () => []) };
  return { service: new JobsService(repository, {} as any, recruitment, {} as any, {} as any, {} as any), repository };
}

describe('RS-R-15 duplicar vaga copia prazo e recrutadores', () => {
  it('copia o prazo quando ele ainda esta no futuro', async () => {
    const { service, repository } = setup({ deadline: future });
    await service.duplicate('c1', 'j1', 'u1');
    expect(repository.create.mock.calls[0][1]).toMatchObject({ deadline: future, status: 'DRAFT' });
  });
  it('prazo vencido nao e copiado (a copia nasceria expirada)', async () => {
    const { service, repository } = setup({ deadline: past });
    const copy: any = await service.duplicate('c1', 'j1', 'u1');
    expect(repository.create.mock.calls[0][1].deadline).toBeNull();
    expect(copy.deadlineReset).toBe(true);
  });
  it('copia os responsaveis da vaga original (exceto quem duplica, que o controller atribui)', async () => {
    const { service, repository } = setup({ deadline: null });
    await service.duplicate('c1', 'j1', 'u1');
    expect(repository.copyRecruiters).toHaveBeenCalledWith('c1', 'j1', 'copy1', 'u1');
  });
  it('copia a flag PCD e o custo fixo da vaga', async () => {
    const { service, repository } = setup({ deadline: null, pcd: true, costAmount: 1500 });
    await service.duplicate('c1', 'j1', 'u1');
    expect(repository.create.mock.calls[0][1]).toMatchObject({ pcd: true, costAmount: 1500 });
  });
});
