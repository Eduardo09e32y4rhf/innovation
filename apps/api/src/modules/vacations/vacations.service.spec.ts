import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { VacationsService } from './vacations.service';

describe('VacationsService', () => {
  const actor = { sub: 'user-1', role: 'RH', email: 'rh@example.com' } as any;

  function makeService(overrides: Record<string, unknown> = {}) {
    const repository: any = {
      findEmployee: vi.fn().mockResolvedValue({
        id: 'employee-1',
        admissionDate: new Date('2024-01-15T00:00:00.000Z'),
        workScale: '5X2',
      }),
      findOverlapping: vi.fn().mockResolvedValue(null),
      listTimeTracksInPeriod: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'vacation-1' }),
      ...overrides,
    };
    return { service: new VacationsService(repository), repository };
  }

  it('rejects malformed acquisition periods before querying attendance', async () => {
    const { service, repository } = makeService();

    await expect(service.create('company-1', actor, {
      employeeId: 'employee-1',
      acquisitionPeriod: '2025',
      startDate: '2026-07-01',
      endDate: '2026-07-10',
      daysUsed: 10,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.listTimeTracksInPeriod).not.toHaveBeenCalled();
  });

  it('rejects vacation periods longer than the legal 30-day limit', async () => {
    const { service } = makeService();

    await expect(service.create('company-1', actor, {
      employeeId: 'employee-1',
      acquisitionPeriod: '2025/2026',
      startDate: '2026-07-01',
      endDate: '2026-08-01',
      daysUsed: 32,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects overlapping pending or approved requests', async () => {
    const { service, repository } = makeService({
      findOverlapping: vi.fn().mockResolvedValue({ id: 'existing' }),
    });

    await expect(service.create('company-1', actor, {
      employeeId: 'employee-1',
      acquisitionPeriod: '2025/2026',
      startDate: '2026-07-01',
      endDate: '2026-07-10',
      daysUsed: 10,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
