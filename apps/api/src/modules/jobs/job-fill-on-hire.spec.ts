import { describe, expect, it, vi } from 'vitest';
import { JobsService } from './jobs.service';

const payload = { department: 'RH', contractType: 'CLT', admissionDate: '2026-11-10' };

function setup(fill: any) {
  const repository = {
    hire: vi.fn().mockResolvedValue({ employee: { id: 'e1' }, alreadyHired: false }),
    fillJobAfterHire: vi.fn().mockResolvedValue(fill),
    audit: vi.fn().mockResolvedValue({}),
  } as any;
  const recruitment = { completeWorkflow: vi.fn(), moveApplication: vi.fn().mockResolvedValue({}) } as any;
  const documents = { sendHireWelcome: vi.fn(), hiringKitStatus: vi.fn().mockResolvedValue({ required: [], approved: [], missing: [] }) } as any;
  const service = new JobsService(repository, {} as any, recruitment, {} as any, {} as any, documents);
  return { service, repository, recruitment };
}

describe('RS-R-02: vaga preenchida ao contratar', () => {
  it('fecha a vaga, rejeita os demais com devolutiva e audita quando as vagas acabam', async () => {
    const { service, repository, recruitment } = setup({ filled: true, jobId: 'j1', title: 'Dev', pending: [{ id: 'a2', rejectedStageId: 's9' }, { id: 'a3', rejectedStageId: 's9' }] });
    await service.hire('c1', 'a1', 'u1', payload);
    expect(repository.fillJobAfterHire).toHaveBeenCalledWith('c1', 'a1');
    expect(recruitment.moveApplication).toHaveBeenCalledTimes(2);
    expect(recruitment.moveApplication).toHaveBeenCalledWith('c1', 'u1', 'a2', expect.objectContaining({ stageId: 's9', rejectionCode: 'VAGA_PREENCHIDA' }));
    expect(repository.audit).toHaveBeenCalledWith('c1', 'u1', 'JOB_FILLED', 'j1', expect.objectContaining({ rejected: 2 }));
  });

  it('mantém a vaga aberta quando ainda há vagas', async () => {
    const { service, recruitment, repository } = setup({ filled: false, jobId: 'j1', title: 'Dev', pending: [] });
    await service.hire('c1', 'a1', 'u1', payload);
    expect(recruitment.moveApplication).not.toHaveBeenCalled();
    expect(repository.audit).not.toHaveBeenCalled();
  });

  it('não repete nada quando o candidato já estava contratado', async () => {
    const { service, repository } = setup(null);
    repository.hire.mockResolvedValue({ employee: { id: 'e1' }, alreadyHired: true });
    await service.hire('c1', 'a1', 'u1', payload);
    expect(repository.fillJobAfterHire).not.toHaveBeenCalled();
  });

  it('falha ao rejeitar um candidato não desfaz a contratação nem impede os outros', async () => {
    const { service, recruitment } = setup({ filled: true, jobId: 'j1', title: 'Dev', pending: [{ id: 'a2', rejectedStageId: 's9' }, { id: 'a3', rejectedStageId: 's9' }] });
    recruitment.moveApplication.mockRejectedValueOnce(new Error('x'));
    await expect(service.hire('c1', 'a1', 'u1', payload)).resolves.toMatchObject({ alreadyHired: false });
    expect(recruitment.moveApplication).toHaveBeenCalledTimes(2);
  });
});
