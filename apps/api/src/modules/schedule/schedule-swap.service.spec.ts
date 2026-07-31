import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ScheduleSwapService } from './schedule-swap.service';

describe('ScheduleSwapService', () => {
  const actor = { sub: 'rh-1', role: 'RH' } as any;

  it('bloqueia troca que intercepta fechamento protegido', async () => {
    const tx = {
      scheduleSwapRequest: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    };
    const prisma: any = {
      employee: { findFirst: vi.fn().mockResolvedValue({ id: 'employee-1' }) },
      timeClosing: { findFirst: vi.fn().mockResolvedValue({ id: 'closing-1', status: 'CLOSED' }) },
      user: { findFirst: vi.fn() },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const service = new ScheduleSwapService(prisma);

    await expect(service.createSwapRequest('company-1', actor, {
      employeeId: 'employee-1',
      originalDate: '2026-07-10',
      targetDate: '2026-07-11',
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.scheduleSwapRequest.create).not.toHaveBeenCalled();
  });

  it('registra solicitacao e auditoria na mesma transacao', async () => {
    const request = { id: 'swap-1', requesterId: 'employee-1' };
    const tx = {
      scheduleSwapRequest: { create: vi.fn().mockResolvedValue(request) },
      auditLog: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma: any = {
      employee: { findFirst: vi.fn().mockResolvedValue({ id: 'employee-1' }) },
      timeClosing: { findFirst: vi.fn().mockResolvedValue(null) },
      user: { findFirst: vi.fn().mockResolvedValue({ id: 'admin-1' }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const service = new ScheduleSwapService(prisma);

    await service.createSwapRequest('company-1', actor, {
      employeeId: 'employee-1',
      originalDate: '2026-08-10',
      targetDate: '2026-08-11',
    });

    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'SCHEDULE_SWAP_REQUESTED',
        entityId: 'swap-1',
      }),
    }));
  });
});
