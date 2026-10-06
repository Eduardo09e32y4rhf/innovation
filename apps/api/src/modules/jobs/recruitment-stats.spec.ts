import { describe, expect, it, vi } from 'vitest';
import { RecruitmentService } from './recruitment.service';
import { jobScopeWhere } from './job-scope.service';

function build() {
  const prisma: any = {
    job: { groupBy: vi.fn(async () => [{ status: 'OPEN', _count: 3 }]) },
    application: { groupBy: vi.fn(async () => [{ status: 'APPLIED', source: 'CAREERS_PORTAL', _count: 5 }]), count: vi.fn(async () => 2) },
    applicationInterview: { findMany: vi.fn(async () => []), count: vi.fn(async () => 7) },
    recruitmentDocument: { count: vi.fn(async () => 4) },
  };
  return { svc: new RecruitmentService(prisma), prisma };
}

describe('estatisticas de recrutamento (dashboard do RH_RS)', () => {
  it('totais reais e restritos ao escopo de vagas do usuario', async () => {
    const { svc, prisma } = build();
    const scope = jobScopeWhere({ sub: 'rs-1', role: 'RH_RS' });
    const stats: any = await svc.stats('c1', scope);
    expect(stats.totals).toEqual({ upcomingInterviews: 7, pendingDocuments: 4 });
    expect(stats.jobs.open).toBe(3);
    expect(prisma.recruitmentDocument.count.mock.calls[0][0].where).toEqual({ companyId: 'c1', status: 'RECEIVED', supersededAt: null, application: { job: { is: scope } } });
    expect(prisma.applicationInterview.count.mock.calls[0][0].where.application).toEqual({ companyId: 'c1', job: { is: scope } });
    expect(prisma.job.groupBy.mock.calls[0][0].where).toMatchObject({ companyId: 'c1', OR: expect.any(Array) });
  });

  it('nao consulta folha, ponto, funcionarios nem ferias', async () => {
    const { svc, prisma } = build();
    await svc.stats('c1', {});
    expect(Object.keys(prisma).sort()).toEqual(['application', 'applicationInterview', 'job', 'recruitmentDocument']);
  });
});