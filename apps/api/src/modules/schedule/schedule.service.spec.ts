import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  const actor = { sub: 'user-1', role: 'RH', email: 'rh@example.com' } as any;

  function makeService(overrides: Record<string, unknown> = {}) {
    const tx = {
      employee: {
        findMany: vi.fn().mockResolvedValue([{ id: 'employee-1', name: 'Alice', department: 'Operacoes' }]),
      },
      schedule: {
        findFirst: vi.fn().mockResolvedValue({ id: 'schedule-1', name: '5x2', workDays: [1, 2, 3, 4, 5] }),
      },
      userSchedule: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      timeClosing: { findMany: vi.fn().mockResolvedValue([]) },
      timeTrack: { count: vi.fn().mockResolvedValue(0) },
      auditLog: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      ...overrides,
    } as any;

    const prisma: any = {
      schedule: { findMany: vi.fn(), findFirst: vi.fn().mockResolvedValue({ id: 'schedule-1', name: '5x2', workDays: [1, 2, 3, 4, 5] }), create: vi.fn(), update: vi.fn() },
      employee: { findMany: vi.fn() },
      userSchedule: { findMany: vi.fn() },
      scheduleException: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
      holiday: { findMany: vi.fn() },
      timeTrack: { findMany: vi.fn(), count: vi.fn().mockResolvedValue(0) },
      timeClosing: { findMany: vi.fn().mockResolvedValue([]) },
      auditLog: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
      },
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
            id: 'assignment-old',
            employeeId: 'employee-1',
            scheduleId: 'schedule-old',
            startDate: new Date('2026-06-15T00:00:00.000Z'),
            endDate: new Date('2026-07-15T00:00:00.000Z'),
            employee: { id: 'employee-1', name: 'Alice' },
            schedule: { id: 'schedule-old', name: 'Escala antiga', workDays: [1, 2, 3, 4, 5] },
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

  it('bloqueia atribuicao que intercepta fechamento protegido', async () => {
    const { service, tx } = makeService({
      timeClosing: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'closing-1',
          employeeId: 'employee-1',
          status: 'CLOSED',
          periodStart: new Date('2026-07-01'),
          periodEnd: new Date('2026-07-31'),
        }]),
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
