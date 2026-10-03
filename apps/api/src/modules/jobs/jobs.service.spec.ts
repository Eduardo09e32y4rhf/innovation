import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { JobsService } from './jobs.service';
import { RecruitmentService } from './recruitment.service';

function setup() {
  const repository = {
    get: vi.fn(),
    find: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    hire: vi.fn(),
  } as any;
  const storage = {} as any;
  return { service: new JobsService(repository, storage, {} as any), repository };
}

describe('JobsService', () => {
  it('converts a candidate through the transactional hire repository', async () => {
    const { service, repository } = setup();
    repository.hire.mockResolvedValue({
      employee: { id: 'employee-1', status: 'ONBOARDING' },
      alreadyHired: false,
    });

    const payload = {
      department: 'RH',
      contractType: 'CLT',
      admissionDate: '2026-07-30',
    };

    await expect(service.hire('company-1', 'application-1', 'user-1', payload)).resolves.toMatchObject({
      employee: { status: 'ONBOARDING' },
      alreadyHired: false,
    });
    expect(repository.hire).toHaveBeenCalledWith('company-1', 'application-1', 'user-1', payload);
  });

  it('returns not found when the application does not belong to the tenant', async () => {
    const { service, repository } = setup();
    repository.hire.mockResolvedValue(null);
    await expect(service.hire('company-1', 'foreign-application', 'user-1', {
      department: 'Financeiro',
      contractType: 'CLT',
      admissionDate: '2026-07-30',
    }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks hiring with incomplete payload', async () => {
    const { service } = setup();
    await expect(service.hire('company-1', 'application-1', 'user-1', {}))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('closes a job with applications instead of deleting its history', async () => {
    const { service, repository } = setup();
    repository.find.mockResolvedValue({ id: 'job-1', _count: { applications: 2 } });
    repository.update.mockResolvedValue({ count: 1 });

    await expect(service.delete('company-1', 'job-1')).resolves.toEqual({
      deleted: false,
      archived: true,
    });
    expect(repository.delete).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith('company-1', 'job-1', { status: 'CLOSED' });
  });

  it('does not expose the internal resume storage key', async () => {
    const stage = { id: 'stage-1', kind: 'APPLIED', name: 'Inscritos' };
    const prisma = {
      job: { findFirst: vi.fn().mockResolvedValue({ id: 'job-1', pipelineId: null }) },
      hiringPipeline: { findFirst: vi.fn().mockResolvedValue({ id: 'p1', stages: [stage] }) },
      application: {
        findMany: vi.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{
            id: 'application-1',
            jobId: 'job-1',
            status: 'APPLIED',
            stageId: 'stage-1',
            createdAt: new Date(),
            resumeUrl: 'private/storage/key.pdf',
            candidate: { id: 'candidate-1', name: 'Maria', email: 'm@x.com' },
            tags: [],
            answers: [],
            evaluations: [],
          }]),
      },
      jobQuestion: { findMany: vi.fn().mockResolvedValue([]) },
      jobCriterion: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;
    const recruitment = new RecruitmentService(prisma);

    const { applications } = await recruitment.listApplications('company-1', 'job-1', {});
    expect(JSON.stringify(applications[0])).not.toContain('private/storage/key.pdf');
    expect(applications[0].resumeAvailable).toBe(true);
    expect(applications[0].resumeDownloadPath).toBe('/jobs/applications/application-1/resume');
  });
});
