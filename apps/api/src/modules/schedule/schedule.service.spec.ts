import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  const actor = { sub: 'user-1', role: 'RH', email: 'rh@example.com' } as any;

  function makeService(overrides: Record<string, unknown> = {}) {
    const tx = {
      employee: {
        findMany: vi.fn().mockResolvedValue([{ id: 'employee-1', name: 'Alice' }]),
      },
      schedule: {
        findFirst: vi.fn().mockResolvedValue({ id: 'schedule-1' }),
      },
      userSchedule: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      ...overrides,
    } as any;

    const prisma: any = {
      schedule: { findMany: vi.fn(), findFirst: vi.fn().mockResolvedValue({ id: 'schedule-1' }), create: vi.fn(), update: vi.fn() },
      employee: { findMany: vi.fn() },
      userSchedule: { findMany: vi.fn() },
      scheduleException: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
      holiday: { findMany: vi.fn() },
      timeTrack: { findMany: vi.fn() },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    };

    return { service: new ScheduleService(prisma), prisma, tx };
  }

  it('bloqueia vigencia sobreposta antes de criar nova atribuicao', async () => {
    const { service, tx } = makeService({
      userSchedule: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([
          {
            employee: { id: 'employee-1', name: 'Alice' },
            schedule: { id: 'schedule-old', name: 'Escala antiga' },
          },
        ]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    });

    await expect(service.assignSchedule('company-1', actor, {
      employeeIds: ['employee-1'],
      scheduleId: 'schedule-1',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    } as any)).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.userSchedule.createMany).not.toHaveBeenCalled();
  });
});
