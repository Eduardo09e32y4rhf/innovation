import 'reflect-metadata';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { JobWorkflowService } from './job-workflow.service';

type Row = { id: string; jobId: string; companyId: string; step: string; position: number; status: string; decidedBy: string | null; decidedAt: Date | null; note: string | null; requestedBy: string | null; remindedAt: Date | null; createdAt: Date };
const row = (step: string, position: number, extra: Partial<Row> = {}): Row => ({ id: `${step}-id`, jobId: 'j1', companyId: 'c1', step, position, status: 'PENDING', decidedBy: null, decidedAt: null, note: null, requestedBy: 'req1', remindedAt: null, createdAt: new Date('2026-10-01T12:00:00Z'), ...extra });

function setup(opts: { status?: string; rows?: Row[]; steps?: string[] } = {}) {
  const state = { rows: opts.rows ?? [row('GESTOR', 0), row('RH', 1)], jobStatus: opts.status ?? 'PENDING_APPROVAL' };
  const prisma: any = {
    recruitmentSetting: { findUnique: vi.fn(async () => ({ approvalSteps: opts.steps ?? ['GESTOR', 'RH'] })) },
    job: {
      findFirst: vi.fn(async () => ({ id: 'j1', title: 'Analista', status: state.jobStatus, department: 'TI' })),
      findMany: vi.fn(async () => [{ id: 'j1', title: 'Analista', department: 'TI' }]),
      updateMany: vi.fn(async ({ data }: any) => { state.jobStatus = data.status; return { count: 1 }; }),
    },
    jobApproval: {
      findMany: vi.fn(async () => state.rows),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async ({ data }: any) => { state.rows = data.map((d: any) => row(d.step, d.position, { requestedBy: d.requestedBy ?? null })); return { count: data.length }; }),
      updateMany: vi.fn(async ({ where, data }: any) => { state.rows = state.rows.map((r) => (r.step === where.step ? { ...r, ...data } : r)); return { count: 1 }; }),
      update: vi.fn(async ({ where, data }: any) => { state.rows = state.rows.map((r) => (r.id === where.id ? { ...r, ...data } : r)); return {}; }),
    },
    user: { findMany: vi.fn(async ({ where }: any) => (where.id ? [{ id: 'req1', name: 'Rita', email: 'rita@x.com' }] : [{ id: 'a1', email: 'ap@x.com' }])) },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const notifier: any = { notify: vi.fn(async () => undefined) };
  return { svc: new JobWorkflowService(prisma, notifier), prisma, notifier, state };
}
const actor = (role: string, sub = 'u1') => ({ sub, companyId: 'c1', role }) as any;

describe('RS-R-01 startApproval avisa o aprovador da vez', () => {
  it('grava quem pediu e notifica o perfil da primeira etapa', async () => {
    const { svc, prisma, notifier } = setup();
    await svc.startApproval('c1', 'j1', ['GESTOR', 'RH'], 'req1');
    expect(prisma.jobApproval.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ step: 'GESTOR', requestedBy: 'req1' }), expect.objectContaining({ step: 'RH', requestedBy: 'req1' })] });
    expect(notifier.notify).toHaveBeenCalledTimes(1);
    const call = notifier.notify.mock.calls[0][0];
    expect(call.kind).toBe('JOB_APPROVAL_TURN');
    expect(call.roles).toEqual(['GESTOR', 'ADMIN']);
    expect(call.userIds).toEqual(['a1']);
    expect(call.lines.join(' ')).toMatch(/Analista/);
  });
  it('falha do aviso nao derruba a requisicao', async () => {
    const { svc, notifier } = setup();
    notifier.notify.mockRejectedValueOnce(new Error('smtp'));
    await expect(svc.startApproval('c1', 'j1', ['GESTOR'], 'req1')).resolves.toBeUndefined();
  });
});

describe('RS-R-01 decide()', () => {
  it('vaga inexistente: 404; fora de aprovacao: 400; perfil errado: 403; recusa sem motivo: 400', async () => {
    const a = setup(); a.prisma.job.findFirst.mockResolvedValueOnce(null);
    await expect(a.svc.decide('c1', 'j1', actor('GESTOR'), { approve: true })).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup({ status: 'OPEN' }).svc.decide('c1', 'j1', actor('GESTOR'), { approve: true })).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup().svc.decide('c1', 'j1', actor('RH'), { approve: true })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(setup().svc.decide('c1', 'j1', actor('GESTOR'), { approve: false, note: '  ' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('aprovar etapa intermediaria avisa o proximo aprovador e mantem a vaga em aprovacao', async () => {
    const { svc, notifier, prisma } = setup();
    const result = await svc.decide('c1', 'j1', actor('GESTOR'), { approve: true });
    expect(result.outcome).toBe('PENDING');
    expect(prisma.job.updateMany).not.toHaveBeenCalled();
    expect(notifier.notify).toHaveBeenCalledTimes(1);
    expect(notifier.notify.mock.calls[0][0]).toMatchObject({ kind: 'JOB_APPROVAL_TURN', roles: ['RH', 'ADMIN'] });
  });
  it('ultima aprovacao abre a vaga e avisa o solicitante', async () => {
    const { svc, notifier, prisma } = setup({ rows: [row('GESTOR', 0, { status: 'APPROVED' }), row('RH', 1)] });
    const result = await svc.decide('c1', 'j1', actor('RH'), { approve: true });
    expect(result.outcome).toBe('APPROVED');
    expect(prisma.job.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'OPEN', closedAt: null } }));
    const call = notifier.notify.mock.calls[0][0];
    expect(call).toMatchObject({ kind: 'JOB_APPROVAL_APPROVED', userIds: ['req1'] });
    expect(call.title).toMatch(/aprovada/i);
  });
  it('recusa devolve a rascunho e avisa o solicitante com o motivo', async () => {
    const { svc, notifier, prisma } = setup();
    const result = await svc.decide('c1', 'j1', actor('GESTOR'), { approve: false, note: 'Sem orçamento' });
    expect(result.outcome).toBe('REJECTED');
    expect(prisma.job.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'DRAFT' } }));
    const call = notifier.notify.mock.calls[0][0];
    expect(call).toMatchObject({ kind: 'JOB_APPROVAL_REJECTED', userIds: ['req1'] });
    expect(call.lines.join(' ')).toContain('Sem orçamento');
  });
});

describe('RS-R-01 lembrete de etapa parada e fila', () => {
  const now = new Date('2026-10-10T12:00:00Z');
  it('lembra o aprovador quando a etapa da vez esta parada ha mais de 3 dias e marca o lembrete', async () => {
    const { svc, notifier, prisma } = setup();
    const result = await svc.remindStale(now);
    expect(result.reminded).toBe(1);
    expect(notifier.notify.mock.calls[0][0]).toMatchObject({ kind: 'JOB_APPROVAL_REMINDER' });
    expect(prisma.jobApproval.update).toHaveBeenCalledWith(expect.objectContaining({ data: { remindedAt: now } }));
  });
  it('nao lembra de novo dentro do mesmo prazo, nem etapa recente', async () => {
    const recent = setup({ rows: [row('GESTOR', 0, { createdAt: new Date('2026-10-09T12:00:00Z') })] });
    expect((await recent.svc.remindStale(now)).reminded).toBe(0);
    const already = setup({ rows: [row('GESTOR', 0, { remindedAt: new Date('2026-10-09T12:00:00Z') })] });
    expect((await already.svc.remindStale(now)).reminded).toBe(0);
  });
  it('a fila "minhas aprovacoes" traz dias parados, atraso e solicitante', async () => {
    const { svc } = setup();
    const list = await svc.pendingFor('c1', actor('GESTOR'), now);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'j1', step: 'GESTOR', waitingDays: 9, overdue: true, requestedByName: 'Rita' });
  });
  it('a fila nao mostra etapas de outro perfil', async () => {
    expect(await setup().svc.pendingFor('c1', actor('RH'), now)).toEqual([]);
  });
});
