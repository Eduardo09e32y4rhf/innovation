import { describe, expect, it, vi } from 'vitest';
import { JobsRepository } from './jobs.repository';

describe('RS-D-02: documentos aprovados entram no dossiê do colaborador', () => {
  it('cria anexos EMPLOYEE só para documentos aprovados vigentes, apontando para o download protegido', async () => {
    const createMany = vi.fn();
    const tx: any = {
      application: {
        findFirst: vi.fn().mockResolvedValue({ id: 'a1', resumeUrl: null, coverLetter: null, candidate: { id: 'cand1', name: 'Ana', email: null, admittedEmployee: null }, job: { title: 'Dev', pipelineId: null }, stage: null }),
        update: vi.fn().mockResolvedValue({}),
      },
      asoClinicPreset: { findFirst: vi.fn().mockResolvedValue(null) },
      candidateAccount: { findFirst: vi.fn() },
      employee: { findFirst: vi.fn(), create: vi.fn().mockResolvedValue({ id: 'emp1' }) },
      employeeAsoRecord: { create: vi.fn() },
      recruitmentDocument: { findMany: vi.fn().mockResolvedValue([{ id: 'd1', label: 'RG', fileName: 'rg.pdf', mimeType: 'application/pdf', size: 10 }]) },
      attachment: { create: vi.fn(), createMany },
      hiringPipeline: { findFirst: vi.fn().mockResolvedValue(null) },
      pipelineStage: { findFirst: vi.fn().mockResolvedValue(null) },
      applicationEvent: { create: vi.fn() },
      candidate: { update: vi.fn() },
    };
    const prisma: any = { $transaction: (fn: any) => fn(tx) };
    const repo = new JobsRepository(prisma);
    const result: any = await repo.hire('c1', 'a1', 'u1', { department: 'RH', contractType: 'CLT', admissionDate: '2026-11-10' });
    expect(result?.alreadyHired).toBe(false);
    expect(tx.recruitmentDocument.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'APPROVED', supersededAt: null, applicationId: 'a1' }) }));
    expect(createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ ownerType: 'EMPLOYEE', ownerId: 'emp1', fileUrl: '/jobs/documents/d1/download', storageKey: null, fileName: 'RG - rg.pdf' })] });
  });
});
