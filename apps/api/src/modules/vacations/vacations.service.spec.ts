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
      findEntitlement: vi.fn().mockResolvedValue(null),
      reserveAndCreate: vi.fn().mockResolvedValue({ id: 'vacation-1' }),
      createMedicalCertificate: vi.fn().mockResolvedValue({ id: 'certificate-1' }),
      recordPayment: vi.fn().mockResolvedValue({ id: 'payment-1' }),
      ...overrides,
    };
    const receiptService: any = { generate: vi.fn() };
    return { service: new VacationsService(repository, receiptService), repository, receiptService };
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
    expect(repository.reserveAndCreate).not.toHaveBeenCalled();
  });

  it('mantem os dias solicitados e grava o ciclo aquisitivo calculado pela admissao', async () => {
    const periodStart = new Date('2025-01-15T00:00:00.000Z');
    const periodEnd = new Date('2026-01-14T00:00:00.000Z');
    const tracks: Array<{ date: Date; entry: Date; manualStatus: string }> = [];
    for (const cursor = new Date(periodStart); cursor <= periodEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const day = cursor.getUTCDay();
      if (day === 0 || day === 6) continue;
      tracks.push({
        date: new Date(cursor),
        entry: new Date(`${cursor.toISOString().slice(0, 10)}T08:00:00.000Z`),
        manualStatus: 'approved',
      });
    }

    const { service, repository } = makeService({
      listTimeTracksInPeriod: vi.fn().mockResolvedValue(tracks),
    });

    await service.create('company-1', actor, {
      employeeId: 'employee-1',
      acquisitionPeriod: '2025/2026',
      startDate: '2026-07-01',
      endDate: '2026-07-10',
      daysUsed: 10,
      observation: 'Férias anuais',
    });

    expect(repository.reserveAndCreate).toHaveBeenCalledWith(expect.objectContaining({
      employeeId: 'employee-1',
      acquisitionPeriod: '2025-01-15/2026-01-14',
      daysUsed: 10,
    }));
  });

  it('autoriza o recibo apenas depois de validar o tenant e o colaborador', async () => {
    const vacation = {
      id: 'vacation-1',
      employeeId: 'employee-1',
      status: 'APPROVED',
      employee: { id: 'employee-1' },
    };
    const { service, receiptService } = makeService({
      findById: vi.fn().mockResolvedValue(vacation),
    });
    receiptService.generate.mockResolvedValue({ documentId: 'document-1' });

    await expect(service.generateReceiptPdf('company-1', actor, 'vacation-1'))
      .resolves.toEqual({ documentId: 'document-1' });
    expect(receiptService.generate).toHaveBeenCalledWith('company-1', actor, vacation);
  });

  it('reserva gozo e abono no mesmo ledger e calcula pagamento dois dias antes', async () => {
    const tracks: Array<{ date: Date; entry: Date; manualStatus: string }> = [];
    for (
      const cursor = new Date('2025-01-15T00:00:00.000Z');
      cursor <= new Date('2026-01-14T00:00:00.000Z');
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      if (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6) continue;
      tracks.push({
        date: new Date(cursor),
        entry: new Date(`${cursor.toISOString().slice(0, 10)}T08:00:00.000Z`),
        manualStatus: 'approved',
      });
    }
    const { service, repository } = makeService({
      listTimeTracksInPeriod: vi.fn().mockResolvedValue(tracks),
    });

    await service.create('company-1', actor, {
      employeeId: 'employee-1',
      acquisitionPeriod: '2025/2026',
      startDate: '2026-07-10',
      endDate: '2026-07-29',
      daysUsed: 20,
      soldDays: 10,
    });

    expect(repository.reserveAndCreate).toHaveBeenCalledWith(expect.objectContaining({
      daysUsed: 20,
      soldDays: 10,
      paymentDueDate: new Date('2026-07-08T00:00:00.000Z'),
      entitlement: expect.objectContaining({
        acquisitionStart: new Date('2025-01-15T00:00:00.000Z'),
        acquisitionEnd: new Date('2026-01-14T00:00:00.000Z'),
        entitledDays: 30,
      }),
    }));
  });

  it('rejeita venda superior a um terco do direito', async () => {
    const { service, repository } = makeService();

    await expect(service.create('company-1', actor, {
      employeeId: 'employee-1',
      acquisitionPeriod: '2025/2026',
      startDate: '2026-07-01',
      endDate: '2026-07-19',
      daysUsed: 19,
      soldDays: 11,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.reserveAndCreate).not.toHaveBeenCalled();
  });

  it('rejeita atestado por horas que cruza dias e exige documento', async () => {
    const { service, repository } = makeService();

    await expect(service.createMedicalCertificate('company-1', actor, {
      employeeId: 'employee-1',
      certificateType: 'HOURS',
      startAt: '2026-07-30T23:00:00.000Z',
      endAt: '2026-07-31T01:00:00.000Z',
      coveredMinutes: 120,
      issueDate: '2026-07-30',
      documentId: 'document-1',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createMedicalCertificate).not.toHaveBeenCalled();
  });

  it('persiste atestado por horas com periodo, minutos e documento', async () => {
    const { service, repository } = makeService();

    await service.createMedicalCertificate('company-1', actor, {
      employeeId: 'employee-1',
      certificateType: 'HOURS',
      startAt: '2026-07-30T10:00:00.000Z',
      endAt: '2026-07-30T12:00:00.000Z',
      coveredMinutes: 120,
      issueDate: '2026-07-30',
      documentId: 'document-1',
    });

    expect(repository.createMedicalCertificate).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'company-1',
      employeeId: 'employee-1',
      certificateType: 'HOURS',
      coveredMinutes: 120,
      documentId: 'document-1',
      createdByUserId: actor.sub,
    }));
  });
});
