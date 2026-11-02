import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { JobsController } from './jobs.controller';
import { computeCosts, noShowRate } from './recruitment-costs';
import { RecruitmentMetricsService } from './recruitment-metrics.service';
import { computeStageSla } from './recruitment-sla';

const d = (s: string) => new Date(`${s}T12:00:00Z`);

describe('RS-R-10 custo por vaga, origem e contratacao', () => {
  const jobs = [
    { id: 'j1', title: 'Dev', costAmount: 500, sourceCosts: [{ source: 'LINKEDIN', amount: 1500 }, { source: 'INDEED', amount: 200.5 }] },
    { id: 'j2', title: 'Analista', costAmount: null, sourceCosts: [] },
  ];
  const apps = [
    { jobId: 'j1', source: 'LINKEDIN', status: 'HIRED' }, { jobId: 'j1', source: 'LINKEDIN', status: 'APPLIED' },
    { jobId: 'j1', source: 'INDEED', status: 'REJECTED' }, { jobId: 'j2', source: 'CAREERS_PORTAL', status: 'HIRED' },
  ];
  const result = computeCosts(jobs, apps);
  it('soma custo fixo + custo por origem e divide pelas contratacoes', () => {
    expect(result.total).toBe(2200.5);
    expect(result.fixedTotal).toBe(500);
    expect(result.sourceTotal).toBe(1700.5);
    expect(result.hires).toBe(2);
    expect(result.costPerHire).toBe(1100.25);
  });
  it('custo por vaga: sem contratacao nao ha custo por contratacao', () => {
    expect(result.byJob.find((row) => row.jobId === 'j1')).toMatchObject({ cost: 2200.5, hires: 1, applications: 3, costPerHire: 2200.5 });
    expect(result.byJob.find((row) => row.jobId === 'j2')).toMatchObject({ cost: 0, hires: 1, costPerHire: 0 });
    expect(computeCosts([jobs[0]], [{ jobId: 'j1', source: 'LINKEDIN', status: 'APPLIED' }]).costPerHire).toBeNull();
  });
  it('custo por origem: por candidatura e por contratacao', () => {
    expect(result.bySource.find((row) => row.source === 'LINKEDIN')).toMatchObject({ cost: 1500, applications: 2, hires: 1, costPerApplication: 750, costPerHire: 1500 });
    expect(result.bySource.find((row) => row.source === 'INDEED')).toMatchObject({ cost: 200.5, hires: 0, costPerHire: null });
  });
  it('sem nenhum custo informado devolve zeros e nulos', () => {
    expect(computeCosts([], [])).toMatchObject({ total: 0, hires: 0, costPerHire: null, byJob: [], bySource: [] });
  });
  it('no-show so aparece quando a entrevista traz o dado', () => {
    expect(noShowRate([{}, {}])).toEqual({ available: false, rate: null, interviews: 0, noShows: 0 });
    expect(noShowRate([{ noShow: true }, { noShow: false }, { noShow: false }, { noShow: false }])).toEqual({ available: true, rate: 25, interviews: 4, noShows: 1 });
  });
});

describe('RS-R-10 SLA e tempo parado por etapa', () => {
  const now = d('2026-10-20');
  const stages = [{ name: 'Triagem', kind: 'SCREENING', slaDays: 3 }, { name: 'Entrevista', kind: 'INTERVIEW', slaDays: null }, { name: 'Reprovado', kind: 'REJECTED', slaDays: null }];
  const apps = [
    { id: 'a1', jobId: 'j1', jobTitle: 'Dev', createdAt: d('2026-10-01'), status: 'INTERVIEW', currentStage: 'Entrevista', stageMovedAt: d('2026-10-06'),
      events: [{ type: 'STAGE_CHANGED', fromStage: 'Triagem', toStage: 'Entrevista', createdAt: d('2026-10-06') }] },
    { id: 'a2', jobId: 'j1', jobTitle: 'Dev', createdAt: d('2026-10-15'), status: 'SCREENING', currentStage: 'Triagem', stageMovedAt: d('2026-10-15'), events: [] },
    { id: 'a3', jobId: 'j2', jobTitle: 'Analista', createdAt: d('2026-10-10'), status: 'REJECTED', currentStage: 'Reprovado', stageMovedAt: d('2026-10-12'),
      events: [{ type: 'REJECTED', fromStage: 'Triagem', toStage: 'Reprovado', createdAt: d('2026-10-12') }] },
  ];
  const sla = computeStageSla(stages, apps, now);
  it('mede o tempo medio gasto em cada etapa ja concluida', () => {
    const triagem = sla.stages.find((row) => row.name === 'Triagem')!;
    expect(triagem).toMatchObject({ samples: 3, slaDays: 3 });
    expect(triagem.averageDays).toBeCloseTo((5 + 2 + 5) / 3, 1);
    expect(triagem.overSla).toBe(2);
  });
  it('conta quem esta parado agora alem do SLA e ordena pelo mais antigo', () => {
    expect(sla.stages.find((row) => row.name === 'Triagem')).toMatchObject({ stalled: 1 });
    expect(sla.stalled).toEqual([{ applicationId: 'a2', jobId: 'j1', jobTitle: 'Dev', stage: 'Triagem', days: 5, slaDays: 3 }]);
  });
  it('etapa sem SLA mede o tempo mas nao marca atraso; etapas finais ficam fora', () => {
    const entrevista = sla.stages.find((row) => row.name === 'Entrevista')!;
    expect(entrevista).toMatchObject({ slaDays: null, overSla: 0, stalled: 0, currentCount: 1 });
    expect(entrevista.averageDays).toBeCloseTo(14, 0);
    expect(sla.stages.some((row) => row.name === 'Reprovado')).toBe(false);
  });
});

describe('RS-R-10 servico de metricas devolve custo, SLA e no-show', () => {
  it('monta as secoes novas a partir do banco', async () => {
    const prisma: any = {
      pipelineStage: { findMany: vi.fn(async () => [{ name: 'Triagem', kind: 'SCREENING', slaDays: 3 }]) },
      application: { findMany: vi.fn(async ({ where }: any) => (where.status === 'HIRED' ? [] : [
        { id: 'a1', jobId: 'j1', createdAt: d('2026-10-15'), status: 'SCREENING', source: 'LINKEDIN', rejectionCode: null, stageMovedAt: d('2026-10-15'), stage: { name: 'Triagem' }, events: [] },
      ])) },
      job: { findMany: vi.fn(async () => [{ id: 'j1', title: 'Dev', createdAt: d('2026-10-01'), costAmount: { toString: () => '300.50' }, recruiters: [], sourceCosts: [{ source: 'LINKEDIN', amount: { toString: () => '99.50' } }] }]), count: vi.fn(async () => 0) },
      candidateDiversity: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
      employee: { count: vi.fn(async () => 0) },
      applicationInterview: { findMany: vi.fn(async () => [{ id: 'i1' }]) },
      user: { findMany: vi.fn(async () => []) },
    };
    const result: any = await new RecruitmentMetricsService(prisma).metrics('c1', {}, { from: '2026-10-01', to: '2026-10-20' });
    expect(result.costs.total).toBe(400);
    expect(result.costs.costPerHire).toBeNull();
    expect(result.stageSla.stages[0]).toMatchObject({ name: 'Triagem', stalled: 1 });
    expect(result.noShow.available).toBe(false);
  });
});

describe('RS-R-10 custo fora do alcance de RH - R&S', () => {
  it('a vaga so aceita costAmount de DEV, ADMIN e RH', async () => {
    const service: any = { create: vi.fn(async () => ({ id: 'j1' })), update: vi.fn(async () => ({})) };
    const controller = new JobsController(service, { assignCreator: vi.fn() } as any, {} as any);
    await expect(controller.create('c1', { sub: 'u1', role: 'RH_RS' } as any, { title: 'x', description: 'y', costAmount: 10 } as any)).rejects.toThrow(/custo/);
    await expect(controller.update('c1', { sub: 'u1', role: 'RH_RS' } as any, 'id', { costAmount: 0 } as any)).rejects.toThrow(/custo/);
    await expect(controller.create('c1', { sub: 'u1', role: 'RH_RS' } as any, { title: 'x', description: 'y' } as any)).resolves.toMatchObject({ id: 'j1' });
    await expect(controller.create('c1', { sub: 'u1', role: 'RH' } as any, { title: 'x', description: 'y', costAmount: 10 } as any)).resolves.toMatchObject({ id: 'j1' });
  });
});

describe('RS-R-10 gravacao dos custos e CSV', () => {
  const build = () => {
    const prisma: any = {
      job: { findFirst: vi.fn(async () => ({ id: 'j1', costAmount: { toString: () => '10' }, sourceCosts: [{ source: 'INDEED', amount: { toString: () => '5.5' } }] })), updateMany: vi.fn(async () => ({ count: 1 })) },
      jobSourceCost: { deleteMany: vi.fn(async () => ({ count: 1 })), createMany: vi.fn(async () => ({ count: 1 })) },
      $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
    };
    return { prisma, service: new RecruitmentMetricsService(prisma) };
  };
  it('substitui os custos por origem, ignora valor zero e atualiza o custo fixo', async () => {
    const { service, prisma } = build();
    const saved = await service.saveCosts('c1', 'j1', { costAmount: 10, sources: [{ source: 'LINKEDIN', amount: 50 }, { source: 'INDEED', amount: 0 }] });
    expect(prisma.jobSourceCost.createMany).toHaveBeenCalledWith({ data: [{ companyId: 'c1', jobId: 'j1', source: 'LINKEDIN', amount: 50 }] });
    expect(prisma.job.updateMany).toHaveBeenCalledWith({ where: { id: 'j1', companyId: 'c1' }, data: { costAmount: 10 } });
    expect(saved).toEqual({ costAmount: 10, sources: [{ source: 'INDEED', amount: 5.5 }] });
  });
  it('origem repetida e vaga de outra empresa sao recusadas', async () => {
    const { service, prisma } = build();
    await expect(service.saveCosts('c1', 'j1', { sources: [{ source: 'LINKEDIN', amount: 1 }, { source: 'LINKEDIN', amount: 2 }] })).rejects.toThrow(/repetida/);
    prisma.job.findFirst.mockResolvedValueOnce(null);
    await expect(service.saveCosts('c1', 'outra', { sources: [] })).rejects.toThrow(/não encontrada/);
    expect(prisma.jobSourceCost.deleteMany).not.toHaveBeenCalled();
  });
  it('o CSV traz custo, SLA e protege contra injecao de formula', async () => {
    const { service } = build();
    vi.spyOn(service, 'metrics').mockResolvedValue({
      period: { from: '2026-01-01', to: '2026-02-01' }, totals: { applications: 3, hired: 1 }, timeToHireDays: { average: 10 }, timeToFillDays: { average: null }, offerAcceptanceRate: 50,
      costs: { total: 100, costPerHire: 100, bySource: [{ source: '=cmd()', cost: 100, costPerHire: 100 }], byJob: [] }, noShow: { available: false, rate: null },
      funnel: [], bySource: [], stageSla: { stages: [{ name: 'Triagem', slaDays: 3, averageDays: 4, stalled: 1, overSla: 2 }] }, pcd: { quota: { required: 9, filled: 4, missing: 5 } },
    } as never);
    const csv = await service.exportCsv('c1', {}, {});
    expect(csv.startsWith('\ufeff')).toBe(true);
    expect(csv).toContain('"Custo por contratação (R$)";"100"');
    expect(csv).toContain('"Triagem";"3";"4";"1";"2"');
    expect(csv).toContain("\"'=cmd()\"");
  });
});
