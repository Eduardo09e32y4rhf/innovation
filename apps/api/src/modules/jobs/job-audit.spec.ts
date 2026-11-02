import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { changedFields, statusAction } from './job-audit';
import { JobAuditService } from './job-audit.service';
import { JobsService } from './jobs.service';

describe('RS-R-09 regras do historico', () => {
  it('statusAction nomeia publicar, pausar, encerrar, reabrir e envio para aprovacao', () => {
    expect(statusAction('DRAFT', 'OPEN')).toBe('JOB_PUBLISHED');
    expect(statusAction(null, 'OPEN')).toBe('JOB_PUBLISHED');
    expect(statusAction('CLOSED', 'OPEN')).toBe('JOB_REOPENED');
    expect(statusAction('PAUSED', 'OPEN')).toBe('JOB_REOPENED');
    expect(statusAction('OPEN', 'PAUSED')).toBe('JOB_PAUSED');
    expect(statusAction('OPEN', 'CLOSED')).toBe('JOB_CLOSED');
    expect(statusAction('OPEN', 'FILLED')).toBe('JOB_CLOSED');
    expect(statusAction('DRAFT', 'PENDING_APPROVAL')).toBe('JOB_SENT_FOR_APPROVAL');
    expect(statusAction('OPEN', 'OPEN')).toBeNull();
    expect(statusAction(null, 'DRAFT')).toBeNull();
  });
  it('changedFields so lista campos que mudaram de verdade (sem valores)', () => {
    const current = { title: 'A', openings: 1, benefits: ['VR'], deadline: new Date('2026-12-01T00:00:00Z'), location: null };
    expect(changedFields(current, { title: 'A', openings: 2, benefits: ['VR'], location: '' })).toEqual(['openings']);
    expect(changedFields(current, { benefits: ['VR', 'VT'], deadline: '2026-12-01T00:00:00.000Z' })).toEqual(['benefits']);
    expect(changedFields(current, { status: 'OPEN', foo: 1 })).toEqual([]);
  });
});

function jobsSetup(current: Record<string, unknown> = { id: 'j1', title: 'Dev', status: 'DRAFT', openings: 1, _count: { applications: 0 } }) {
  const repository: any = {
    monthlyJobQuota: vi.fn(async () => null),
    create: vi.fn(async (_c: string, data: any) => ({ id: 'new1', ...data })),
    find: vi.fn(async () => current),
    update: vi.fn(async () => ({ count: 1 })),
    delete: vi.fn(async () => ({ count: 1 })),
    permanentDeletePlan: vi.fn(async () => ({ hired: 0, resumeKeys: [], documentKeys: [] })),
    copyRecruiters: vi.fn(async () => 0),
    audit: vi.fn(async () => ({})),
  };
  const workflow: any = { prepare: vi.fn(async (_c: string, i: any) => ({ status: i.nextStatus, startApproval: false, steps: [] })), startApproval: vi.fn() };
  const recruitment: any = { getQuestions: vi.fn(async () => []), getCriteria: vi.fn(async () => []) };
  const audit = new JobAuditService(repository, {} as any);
  const service = new JobsService(repository, { remove: vi.fn() } as any, recruitment, {} as any, workflow, {} as any, undefined, undefined, audit);
  return { service, repository, workflow };
}
const actions = (repository: any) => repository.audit.mock.calls.map((call: any[]) => call[2]);

describe('RS-R-09 JobsService grava AuditLog via repository.audit', () => {
  it('criar e publicar', async () => {
    const { service, repository } = jobsSetup();
    await service.create('c1', { title: 'Dev', description: 'x', status: 'OPEN' } as any, 'u1');
    expect(actions(repository)).toEqual(['JOB_CREATED', 'JOB_PUBLISHED']);
    expect(repository.audit.mock.calls[0].slice(0, 3)).toEqual(['c1', 'u1', 'JOB_CREATED']);
  });
  it('editar registra so os nomes dos campos alterados', async () => {
    const { service, repository } = jobsSetup();
    await service.update('c1', 'j1', { title: 'Dev Sr', openings: 1 } as any, 'u1');
    expect(actions(repository)).toEqual(['JOB_UPDATED']);
    expect(repository.audit.mock.calls[0][4]).toEqual({ fields: ['title'] });
  });
  it('encerrar e publicar sao acoes proprias', async () => {
    const open = jobsSetup({ id: 'j1', title: 'Dev', status: 'OPEN', openings: 1, _count: { applications: 0 } });
    await open.service.update('c1', 'j1', { status: 'CLOSED' } as any, 'u1');
    expect(actions(open.repository)).toEqual(['JOB_CLOSED']);
    const draft = jobsSetup();
    await draft.service.update('c1', 'j1', { status: 'OPEN' } as any, 'u1');
    expect(actions(draft.repository)).toEqual(['JOB_PUBLISHED']);
  });
  it('duplicar e arquivar', async () => {
    const { service, repository } = jobsSetup({ id: 'j1', title: 'Dev', status: 'OPEN', openings: 1, _count: { applications: 3 } });
    await service.duplicate('c1', 'j1', 'u1');
    await service.delete('c1', 'j1', 'u1', 'archive');
    expect(actions(repository)).toEqual(['JOB_DUPLICATED', 'JOB_ARCHIVED']);
  });
  it('sem usuario (rollback interno) nao grava e falha de auditoria nao derruba a acao', async () => {
    const { service, repository } = jobsSetup();
    await service.create('c1', { title: 'Dev', description: 'x', status: 'DRAFT' } as any);
    expect(repository.audit).not.toHaveBeenCalled();
    repository.audit.mockRejectedValue(new Error('db'));
    await expect(service.create('c1', { title: 'Dev', description: 'x', status: 'DRAFT' } as any, 'u1')).resolves.toMatchObject({ id: 'new1' });
  });
});

describe('RS-R-09 historico e movimentacao em lote', () => {
  it('history lista da mais recente para a mais antiga, com nome de quem agiu', async () => {
    const prisma: any = {
      auditLog: { findMany: vi.fn(async () => [{ id: 'a', action: 'JOB_PUBLISHED', createdAt: new Date(), metadata: { to: 'OPEN' }, userId: 'u1' }]) },
      user: { findMany: vi.fn(async () => [{ id: 'u1', name: 'Rita' }]) },
    };
    const rows = await new JobAuditService({} as any, prisma).history('c1', 'j1');
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: 'c1', entity: 'Job', entityId: 'j1' }, orderBy: { createdAt: 'desc' } }));
    expect(rows[0]).toMatchObject({ label: 'Vaga publicada', userName: 'Rita' });
  });
  it('recordBulkMove grava uma linha por vaga com a quantidade', async () => {
    const prisma: any = { application: { findMany: vi.fn(async () => [{ jobId: 'j1' }, { jobId: 'j1' }, { jobId: 'j2' }]) } };
    const repository: any = { audit: vi.fn(async () => ({})) };
    await new JobAuditService(repository, prisma).recordBulkMove('c1', 'u1', ['a', 'b', 'c'], 's1', 3);
    expect(repository.audit).toHaveBeenCalledTimes(2);
    expect(repository.audit).toHaveBeenCalledWith('c1', 'u1', 'JOB_STAGE_CHANGED', 'j1', { bulk: true, stageId: 's1', candidates: 2 });
  });
});
