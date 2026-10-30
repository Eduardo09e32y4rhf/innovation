import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { JobWorkflowService } from './job-workflow.service';

// API-06: GET /job-workflow/jobs/:id/approvals - papel x recurso (dentro da mesma empresa).
const rows = (steps: string[]) => steps.map((step, position) => ({ id: step, jobId: 'j1', companyId: 'c1', step, position, status: 'PENDING', decidedBy: null }));
const svcWith = (steps: string[]) => {
  const prisma: any = { jobApproval: { findMany: vi.fn(async () => rows(steps)) }, user: { findMany: vi.fn(async () => []) } };
  return new JobWorkflowService(prisma, { notify: vi.fn() } as any);
};
const actor = (role: string) => ({ sub: 'u1', companyId: 'c1', role }) as any;

describe('API-06 aprovacoes de vaga por papel', () => {
  it.each(['DEV', 'ADMIN', 'RH'])('%s ve todas as etapas de qualquer vaga da empresa', async (role) => {
    expect(await svcWith(['GESTOR', 'RH', 'FINANCEIRO']).approvalsFor('c1', 'j1', actor(role))).toHaveLength(3);
  });
  it('GESTOR so ve vaga que tem etapa de Gestor', async () => {
    expect(await svcWith(['GESTOR', 'RH']).approvalsFor('c1', 'j1', actor('GESTOR'))).toHaveLength(2);
    expect(await svcWith(['RH', 'FINANCEIRO']).approvalsFor('c1', 'j1', actor('GESTOR'))).toEqual([]);
    expect(await svcWith([]).approvalsFor('c1', 'j1', actor('GESTOR'))).toEqual([]);
  });
  it('CEO e CONTABIL so veem vaga que tem etapa Financeiro', async () => {
    for (const role of ['CEO', 'CONTABIL']) {
      expect(await svcWith(['GESTOR', 'RH']).approvalsFor('c1', 'j1', actor(role)), role).toEqual([]);
      expect(await svcWith(['FINANCEIRO']).approvalsFor('c1', 'j1', actor(role)), role).toHaveLength(1);
    }
  });
  it('consulta sempre escopada pela empresa do usuario', async () => {
    const svc = svcWith(['GESTOR']);
    await svc.approvalsFor('c1', 'j1', actor('RH'));
    expect((svc as any).prisma.jobApproval.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: 'c1', jobId: 'j1' } }));
  });
});
