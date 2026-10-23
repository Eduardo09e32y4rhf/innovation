import { describe, expect, it, vi } from 'vitest';
import { TimeTrackService } from './time-track.service';

describe('lançamento manual de folga de banco', () => {
  it('grava zero trabalhado, debita só o saldo e limpa horas extras antigas', async () => {
    const repository = { upsert: vi.fn(async (_id, date, data) => ({ id: 'point-1', employeeId: 'employee-1', date, ...data })) };
    const prisma = {
      overtimeRule: { findUnique: vi.fn().mockResolvedValue({ overtimePolicy: 'BANK', bankValidityMonths: 3 }) },
      timeOccurrence: { deleteMany: vi.fn(), createMany: vi.fn() },
    };
    const service = new TimeTrackService(repository as any, {} as any, {} as any, {} as any, prisma as any, {} as any);
    (service as any).resolveCalculationContext = vi.fn().mockResolvedValue({ employeeForCalculation: {}, rule: { dailyMinutes: 480 }, holiday: null });
    const saved = await (service as any).applyManual('company-1', { sub: 'rh-1', role: 'RH' }, { id: 'employee-1', dailyWorkload: '08:00' }, '2026-10-03', { reason: 'ajuste_abono_folga' });
    expect(saved).toMatchObject({ totalWorked: 0, dailyBalance: -480, overtime50Minutes: 0, overtime100Minutes: 0, overtimeBankMinutes: 0, lateMinutes: 0, absenceMinutes: 0, manualStatus: 'approved' });
    expect(repository.upsert).toHaveBeenCalledOnce();
  });
});
