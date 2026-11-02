import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CandidateAccountService } from './candidate-account.service';

const account: any = { id: 'acc1', email: 'ana@exemplo.com' };

function setup(app: any) {
  const prisma: any = {
    application: { findFirst: vi.fn().mockResolvedValue(app) },
    hiringPipeline: { findFirst: vi.fn().mockResolvedValue({ id: 'p1' }) },
    pipelineStage: { findFirst: vi.fn().mockResolvedValue({ id: 'sRej' }) },
  };
  const recruitment: any = { moveApplication: vi.fn().mockResolvedValue({}) };
  const notifier: any = { notify: vi.fn().mockResolvedValue(undefined) };
  const svc = new CandidateAccountService(prisma, {} as any, {} as any, {} as any, undefined, undefined, recruitment, notifier);
  return { svc, prisma, recruitment, notifier };
}
const live = { id: 'a1', companyId: 'c1', status: 'INTERVIEW', stage: { pipelineId: 'p1' }, candidate: { name: 'Ana' }, job: { id: 'j1', title: 'Dev', pipelineId: 'p1', recruiters: [{ userId: 'u1' }] } };

describe('RS-C-11: candidato desiste da candidatura', () => {
  it('só enxerga candidaturas do próprio e-mail', async () => {
    const { svc, prisma } = setup(null);
    await expect(svc.withdraw(account, 'a1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.application.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'a1', candidate: { email: { equals: 'ana@exemplo.com', mode: 'insensitive' } } }) }));
  });
  it('recusa quando já foi contratado ou encerrado', async () => {
    for (const status of ['HIRED', 'REJECTED']) {
      const { svc, recruitment } = setup({ ...live, status });
      await expect(svc.withdraw(account, 'a1')).rejects.toBeInstanceOf(ConflictException);
      expect(recruitment.moveApplication).not.toHaveBeenCalled();
    }
  });
  it('move para reprovados com código DESISTENCIA e avisa o RH', async () => {
    const { svc, recruitment, notifier } = setup(live);
    await expect(svc.withdraw(account, 'a1')).resolves.toEqual({ withdrawn: true });
    expect(recruitment.moveApplication).toHaveBeenCalledWith('c1', null, 'a1', expect.objectContaining({ stageId: 'sRej', rejectionCode: 'DESISTENCIA' }));
    expect(notifier.notify).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'c1', jobId: 'j1', userIds: ['u1'], kind: 'APPLICATION_WITHDRAWN' }));
  });
});
