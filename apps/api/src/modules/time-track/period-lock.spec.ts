import { vi } from 'vitest';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { assertTimePeriodOpen } from './period-lock';
import { TimeOccurrencesService } from './time-occurrences.service';
import { TimeTrackService } from './time-track.service';
import { TimeClosingService } from './time-closing.service';
import { PayrollCalculationService } from './payroll-calculation.service';

const locked = { id: 'cl-1', status: 'CLOSED', periodStart: new Date('2027-01-01T00:00:00Z'), periodEnd: new Date('2027-01-31T00:00:00Z') };
const day = new Date('2027-01-15T00:00:00Z');

describe('período fechado bloqueia ajuste de ponto (409)', () => {
  it('fechamento CLOSED/APPROVED que cobre a data -> 409 PERIOD_CLOSED com orientação', async () => {
    const prisma: any = { timeClosing: { findFirst: vi.fn().mockResolvedValue(locked) } };
    const error: any = await assertTimePeriodOpen(prisma, 'c1', 'e1', day).catch((e) => e);
    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse().code).toBe('PERIOD_CLOSED');
    expect(error.getResponse().message).toContain('Reabra o fechamento');
    const where = prisma.timeClosing.findFirst.mock.calls[0][0].where;
    expect(where.status).toEqual({ in: ['APPROVED', 'CLOSED'] });
    expect(where.periodStart).toEqual({ lte: day });
    expect(where.periodEnd).toEqual({ gte: day });
    expect(where.companyId).toBe('c1');
    expect(where.employeeId).toBe('e1');
  });

  it('sem fechamento travado (rascunho/em revisão ficam fora do filtro) -> segue', async () => {
    const prisma: any = { timeClosing: { findFirst: vi.fn().mockResolvedValue(null) } };
    await expect(assertTimePeriodOpen(prisma, 'c1', 'e1', day)).resolves.toBeUndefined();
  });

  it('criar ocorrência em período fechado -> 409 e nada é gravado', async () => {
    const prisma: any = { timeClosing: { findFirst: vi.fn().mockResolvedValue(locked) }, timeOccurrence: { create: vi.fn() } };
    const svc = new TimeOccurrencesService(prisma, { assertEmployee: vi.fn() } as any);
    await expect(svc.create({ companyId: 'c1', sub: 'u1' } as any, { employeeId: 'e1', type: 'JUSTIFIED_ABSENCE', date: '2027-01-15' } as any)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.timeOccurrence.create).not.toHaveBeenCalled();
  });

  it('criar ocorrência em período aberto -> grava', async () => {
    const prisma: any = { timeClosing: { findFirst: vi.fn().mockResolvedValue(null) }, timeOccurrence: { create: vi.fn().mockResolvedValue({ id: 'o1' }) } };
    const svc = new TimeOccurrencesService(prisma, { assertEmployee: vi.fn() } as any);
    await svc.create({ companyId: 'c1', sub: 'u1' } as any, { employeeId: 'e1', type: 'JUSTIFIED_ABSENCE', date: '2027-01-15' } as any);
    expect(prisma.timeOccurrence.create).toHaveBeenCalledTimes(1);
  });

  it('excluir e aprovar ponto em período fechado -> 409 e nada muda', async () => {
    const repo: any = { findById: vi.fn().mockResolvedValue({ id: 't1', employeeId: 'e1', date: day, manualStatus: 'pending' }), delete: vi.fn(), updateManualStatus: vi.fn() };
    const prisma: any = { timeClosing: { findFirst: vi.fn().mockResolvedValue(locked) } };
    const svc = new TimeTrackService(repo, {} as any, {} as any, {} as any, prisma, {} as any);
    await expect(svc.delete('c1', { sub: 'u', role: 'RH' } as any, 't1')).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.revokeManual('c1', { sub: 'u', role: 'RH' } as any, 't1', 'motivo')).rejects.toBeInstanceOf(ConflictException);
    expect(repo.delete).not.toHaveBeenCalled();
    expect(repo.updateManualStatus).not.toHaveBeenCalled();
  });
});

describe('reabertura auditada do fechamento', () => {
  const actor = { sub: 'rh-1', role: 'RH' } as any;
  const build = (status: string) => {
    const prisma: any = {
      timeClosing: { findFirst: vi.fn().mockResolvedValue({ id: 'cl-1', status, employeeId: 'e1', periodStart: locked.periodStart, periodEnd: locked.periodEnd }), update: vi.fn().mockResolvedValue({ id: 'cl-1', status: 'DRAFT' }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    return { prisma, svc: new TimeClosingService(prisma, new PayrollCalculationService()) };
  };

  it.each(['CLOSED', 'APPROVED'])('reabre %s com motivo e grava auditoria', async (status) => {
    const { prisma, svc } = build(status);
    await svc.reopen('c1', actor, 'cl-1', ' erro de marcação ');
    expect(prisma.timeClosing.update.mock.calls[0][0].data).toMatchObject({ status: 'DRAFT', reopenedBy: 'rh-1', reopenReason: 'erro de marcação' });
    const audit = prisma.auditLog.create.mock.calls[0][0].data;
    expect(audit).toMatchObject({ action: 'TIME_CLOSING_REOPENED', entity: 'TimeClosing', entityId: 'cl-1', userId: 'rh-1' });
    expect(audit.metadata).toMatchObject({ from: status, reason: 'erro de marcação' });
  });

  it('sem motivo ou em rascunho -> 400 e nada gravado', async () => {
    const { prisma, svc } = build('DRAFT');
    await expect(svc.reopen('c1', actor, 'cl-1', '   ')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.reopen('c1', actor, 'cl-1', 'motivo')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.timeClosing.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
