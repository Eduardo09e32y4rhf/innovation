import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { JobsService } from './jobs.service';

function setup() {
  const repository = {
    get: vi.fn(),
    find: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    hire: vi.fn(),
    applications: vi.fn(),
  } as any;
  const storage = {} as any;
  return { service: new JobsService(repository, storage), repository };
}

describe('JobsService', () => {
  it('converts a candidate through the transactional hire repository', async () => {
    const { service, repository } = setup();
    repository.hire.mockResolvedValue({
      employee: { id: 'employee-1', status: 'ONBOARDING' },
      alreadyHired: false,
    });

    await expect(service.hire('company-1', 'application-1', 'user-1', {})).resolves.toMatchObject({
      employee: { status: 'ONBOARDING' },
      alreadyHired: false,
    });
    expect(repository.hire).toHaveBeenCalledWith('company-1', 'application-1', 'user-1', {});
  });

  it('returns not found when the application does not belong to the tenant', async () => {
    const { service, repository } = setup();
    repository.hire.mockResolvedValue(null);
    await expect(service.hire('company-1', 'foreign-application', 'user-1', {}))
      .rejects.toBeInstanceOf(NotFoundException);
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
    const { service, repository } = setup();
    repository.find.mockResolvedValue({ id: 'job-1', _count: { applications: 1 } });
    repository.applications.mockResolvedValue([{
      id: 'application-1',
      candidate: { id: 'candidate-1', resumeUrl: 'private/storage/key.pdf' },
    }]);

    const [application] = await service.applications('company-1', 'job-1');
    expect(application.candidate.resumeUrl).toBeUndefined();
    expect(application.candidate.resumeAvailable).toBe(true);
    expect(application.candidate.resumeDownloadPath).toBe('/jobs/applications/application-1/resume');
  });
});
