import { describe, expect, it, vi } from 'vitest';
import { JobsService } from './jobs.service';

function setup(recruiterIds: string[]) {
  const repository: any = { jobRecruiterIds: vi.fn().mockResolvedValue(recruiterIds) };
  const notifier: any = { notify: vi.fn().mockResolvedValue(undefined) };
  const service: any = new JobsService(repository, {} as any, {} as any, {} as any, {} as any, {} as any, undefined, undefined, undefined, notifier);
  return { service, repository, notifier };
}

describe('RS-R-03: recrutador é avisado de nova candidatura', () => {
  it('avisa os responsáveis da vaga com o nome do candidato', async () => {
    const { service, notifier } = setup(['u1', 'u2']);
    await service.notifyNewApplication({ id: 'j1', companyId: 'c1', title: 'Dev' }, 'Ana Souza', false);
    expect(notifier.notify).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'c1', jobId: 'j1', userIds: ['u1', 'u2'], kind: 'APPLICATION_RECEIVED', title: expect.stringContaining('Ana Souza') }));
  });
  it('não avisa quando a candidatura foi reprovada automaticamente por pergunta eliminatória', async () => {
    const { service, notifier } = setup(['u1']);
    await service.notifyNewApplication({ id: 'j1', companyId: 'c1', title: 'Dev' }, 'Ana', true);
    expect(notifier.notify).not.toHaveBeenCalled();
  });
  it('nunca derruba a candidatura se o aviso falhar', async () => {
    const { service, repository } = setup([]);
    repository.jobRecruiterIds.mockRejectedValue(new Error('db'));
    await expect(service.notifyNewApplication({ id: 'j1', companyId: 'c1', title: 'Dev' }, 'Ana', false)).resolves.toBeUndefined();
  });
});
