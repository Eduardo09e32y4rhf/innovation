import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PayrollCalculationService } from './payroll-calculation.service';
import { TimeClosingService } from './time-closing.service';
import { vi } from 'vitest';

describe('TimeClosingService', () => {
  it('bloqueia fechamento quando a ficha nao possui salario', async () => {
    const prisma: any = {
      employee: { findMany: vi.fn().mockResolvedValue([{ id: 'employee-1', name: 'Sem Salario', salary: null }]) },
      company: { findUnique: vi.fn().mockResolvedValue({ payrollStartDay: 1 }) },
    };
    const service = new TimeClosingService(prisma, new PayrollCalculationService());
    await expect(service.generate('company-1', {} as any, { month: 7, year: 2026 }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('gera folha coletiva no backend com snapshot, metadados e hash SHA-256', async () => {
    const closing = {
      id: 'closing-0001',
      companyId: 'company-1',
      employeeId: 'employee-1',
      periodStart: new Date('2026-07-01T00:00:00.000Z'),
      periodEnd: new Date('2026-07-31T00:00:00.000Z'),
      status: 'CLOSED',
      normalHours: 176,
      overtime50: 2,
      overtime100: 0,
      nightShift: 0,
      absenceMinutes: 0,
      lateMinutes: 15,
      earlyLeaveMinutes: 0,
      payableWorkdays: 22,
      calculationVersion: 'CLT_2026_1',
      taxTableSnapshot: { version: 'BR_2026_01' },
      updatedAt: new Date('2026-07-30T12:00:00.000Z'),
      employee: {
        id: 'employee-1',
        name: 'Ana Souza',
        cpf: '12345678901',
        registration: '0001',
        position: 'Analista',
        department: 'RH',
      },
      company: { name: 'Empresa Teste', document: '12345678000190' },
    };
    const prisma: any = {
      timeClosing: { findMany: vi.fn().mockResolvedValue([closing]) },
      timeTrack: {
        findMany: vi.fn().mockResolvedValue([{
          employeeId: 'employee-1',
          date: new Date('2026-07-01T00:00:00.000Z'),
          entry: new Date('2026-07-01T11:00:00.000Z'),
          lunchStart: new Date('2026-07-01T15:00:00.000Z'),
          lunchReturn: new Date('2026-07-01T16:00:00.000Z'),
          exit: new Date('2026-07-01T20:00:00.000Z'),
          totalWorked: 480,
          dailyBalance: 0,
          incidentType: null,
        }]),
      },
    };
    const service = new TimeClosingService(prisma, new PayrollCalculationService());

    const artifact = await service.getCollectivePdf(
      'company-1',
      { sub: 'user-rh', role: 'RH' } as any,
      { month: '2026-07', employeeIds: 'employee-1' },
    );

    expect(artifact.buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(artifact.hash).toBe(createHash('sha256').update(artifact.buffer).digest('hex'));
    expect(artifact.documentId).toMatch(/^POINT-COLLECTIVE-2026-07-/);
    expect(artifact.recordCount).toBe(1);
    expect(artifact.calculationVersions).toEqual(['CLT_2026_1']);
    expect(prisma.timeClosing.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        companyId: 'company-1',
        employeeId: { in: ['employee-1'] },
      }),
    }));
  });

  it('publica hash e metadados do PDF coletivo nos headers', async () => {
    const service = new TimeClosingService({} as any, new PayrollCalculationService());
    const buffer = Buffer.from('%PDF-test');
    vi.spyOn(service, 'getCollectivePdf').mockResolvedValue({
      buffer,
      hash: createHash('sha256').update(buffer).digest('hex'),
      documentId: 'POINT-COLLECTIVE-2026-07-test',
      generatedAt: new Date('2026-07-30T12:00:00.000Z'),
      filename: 'Folha_Ponto_Coletiva_2026-07.pdf',
      recordCount: 2,
      calculationVersions: ['CLT_2026_1'],
    });
    const headers: Record<string, string> = {};
    const response = {
      setHeader: vi.fn((name: string, value: string) => { headers[name] = value; }),
      end: vi.fn(),
    };

    await service.streamCollectivePdf(
      'company-1',
      { sub: 'user-rh', role: 'RH' } as any,
      { month: '2026-07' },
      response,
    );

    expect(headers['Content-Type']).toBe('application/pdf');
    expect(headers['X-Document-Sha256']).toHaveLength(64);
    expect(headers['X-Document-Type']).toBe('TIME_CLOSING_COLLECTIVE');
    expect(headers['X-Document-Records']).toBe('2');
    expect(headers.Digest).toMatch(/^sha-256=/);
    expect(response.end).toHaveBeenCalledWith(buffer);
  });

  it('impede funcionario de emitir folha de outro colaborador', async () => {
    const prisma: any = {
      employee: { findFirst: vi.fn().mockResolvedValue({ id: 'employee-self' }) },
    };
    const service = new TimeClosingService(prisma, new PayrollCalculationService());

    await expect(service.getCollectivePdf(
      'company-1',
      { sub: 'user-1', role: 'FUNCIONARIO' } as any,
      { month: '2026-07', employeeIds: 'employee-other' },
    )).rejects.toBeInstanceOf(ForbiddenException);
  });
});
