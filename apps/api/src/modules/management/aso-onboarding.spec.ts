import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AsoService } from './aso.service';

function setup(result: 'APTO' | 'INAPTO' | null) {
  const current = {
    id: 'aso-1',
    companyId: 'company-1',
    employeeId: 'employee-1',
    asoType: 'ADMISSIONAL',
    status: 'SCHEDULED',
    result: null,
    examDate: null,
    completedAt: null,
  };
  const updated = { ...current, status: 'COMPLETED', result };
  const tx = {
    employeeAsoRecord: { update: vi.fn().mockResolvedValue(updated) },
    employee: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findFirst: vi.fn().mockResolvedValue({ id: 'employee-1', name: 'Pessoa Teste', email: null, userId: null }),
      update: vi.fn(),
    },
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    notification: { create: vi.fn().mockResolvedValue({ id: 'notification-1' }) },
  };
  const prisma = {
    employeeAsoRecord: { findFirst: vi.fn().mockResolvedValue(current) },
    $transaction: vi.fn(async (callback: any) => callback(tx)),
  } as any;
  return { service: new AsoService(prisma), tx };
}

describe('ASO onboarding activation', () => {
  it('activates onboarding employee only after admission ASO completed as APTO', async () => {
    const { service, tx } = setup('APTO');
    await service.update('company-1', 'aso-1', 'user-1', {
      status: 'COMPLETED',
      result: 'APTO',
    });
    expect(tx.employee.updateMany).toHaveBeenCalledWith({
      where: { companyId: 'company-1', id: 'employee-1', status: 'ONBOARDING' },
      data: { status: 'ACTIVE' },
    });
  });

  it('keeps onboarding employee blocked when the result is INAPTO', async () => {
    const { service, tx } = setup('INAPTO');
    await service.update('company-1', 'aso-1', 'user-1', {
      status: 'COMPLETED',
      result: 'INAPTO',
    });
    expect(tx.employee.updateMany).not.toHaveBeenCalled();
  });

  it('rejects completed ASO without an explicit result', async () => {
    const { service } = setup(null);
    await expect(service.update('company-1', 'aso-1', 'user-1', { status: 'COMPLETED' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
