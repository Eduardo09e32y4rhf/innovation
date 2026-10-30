import { describe, expect, it, vi } from 'vitest';
import { JobExpiryService } from './job-expiry.service';

const NOW = new Date('2026-11-02T12:00:00Z');
function setup(jobs: any[]) {
  const prisma = {
    job: { findMany: vi.fn().mockResolvedValue(jobs), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  } as any;
  const notifier = { notify: vi.fn().mockResolvedValue(undefined) } as any;
  return { service: new JobExpiryService(prisma, notifier), prisma, notifier };
}

describe('RS-R-05: encerramento automático por prazo', () => {
  it('fecha só vagas OPEN com prazo vencido, avisa responsáveis e audita', async () => {
    const { service, prisma, notifier } = setup([{ id: 'j1', companyId: 'c1', title: 'Dev', deadline: new Date('2026-11-01T02:59:00Z'), recruiters: [{ userId: 'u1' }] }]);
    const result = await service.closeExpired(NOW);
    expect(prisma.job.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'OPEN', deadline: { lt: NOW } }) }));
    expect(prisma.job.updateMany).toHaveBeenCalledWith({ where: { id: 'j1', status: 'OPEN' }, data: { status: 'CLOSED', closedAt: NOW } });
    expect(notifier.notify).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'c1', jobId: 'j1', userIds: ['u1'], kind: 'JOB_EXPIRED' }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'JOB_EXPIRED', entityId: 'j1' }) }));
    expect(result).toEqual({ closed: 1 });
  });

  it('não avisa nem audita quando outra instância já fechou a vaga', async () => {
    const { service, prisma, notifier } = setup([{ id: 'j1', companyId: 'c1', title: 'Dev', deadline: new Date('2026-11-01T00:00:00Z'), recruiters: [] }]);
    prisma.job.updateMany.mockResolvedValue({ count: 0 });
    expect(await service.closeExpired(NOW)).toEqual({ closed: 0 });
    expect(notifier.notify).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('falha ao avisar uma vaga não impede as outras', async () => {
    const { service, notifier } = setup([
      { id: 'j1', companyId: 'c1', title: 'A', deadline: new Date('2026-11-01'), recruiters: [] },
      { id: 'j2', companyId: 'c1', title: 'B', deadline: new Date('2026-11-01'), recruiters: [] },
    ]);
    notifier.notify.mockRejectedValueOnce(new Error('smtp'));
    expect(await service.closeExpired(NOW)).toEqual({ closed: 2 });
  });
});
