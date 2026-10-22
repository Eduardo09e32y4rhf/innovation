import { BadRequestException, ConflictException, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Readable } from 'stream';
import { describe, expect, it, vi } from 'vitest';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TerminationController } from './termination.controller';
import { FINALIZE_CONFIRMATION, TerminationService } from './termination.service';

const COMPANY = '00000000-0000-0000-0000-0000000000c1';
const OTHER_COMPANY = '00000000-0000-0000-0000-0000000000c2';
const EMPLOYEE = '00000000-0000-0000-0000-0000000000e1';
const actor = { sub: '00000000-0000-0000-0000-0000000000a1', companyId: COMPANY, role: 'RH', email: 'rh@example.com', name: 'RH Teste' } as any;

const dto = { type: 'SEM_JUSTA_CAUSA', terminationDate: '2026-10-20', confirm: FINALIZE_CONFIRMATION, fgtsBalance: 5000 } as any;

function fixture(over: { employee?: any; closings?: any[] } = {}) {
  const employeeRow = {
    id: EMPLOYEE, userId: '00000000-0000-0000-0000-0000000000b1', name: 'Maria Souza', cpf: '12345678901', registration: '10',
    position: 'Analista', salary: 3000, dependents: null, admissionDate: new Date('2025-01-10T00:00:00Z'), terminationDate: null, status: 'ACTIVE',
    ...over.employee,
  };
  const tx: any = {
    employee: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    terminationRecord: { create: vi.fn() },
    refreshSession: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    user: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    employeeAsoRecord: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  let stored: any = null;
  tx.terminationRecord.create.mockImplementation(async ({ data }: any) => {
    stored = { id: 'rec-1', ...data, documentId: null, sha256: null, createdAt: new Date() };
    return stored;
  });
  const prisma: any = {
    employee: { findFirst: vi.fn().mockResolvedValue(employeeRow) },
    timeClosing: { findMany: vi.fn().mockResolvedValue(over.closings ?? []) },
    vacationEntitlement: { findMany: vi.fn().mockResolvedValue([]) },
    terminationRecord: {
      findFirst: vi.fn().mockImplementation(async () => stored),
      update: vi.fn().mockImplementation(async ({ data }: any) => Object.assign(stored, data)),
    },
    generatedDocument: { create: vi.fn().mockResolvedValue({ id: 'doc-1' }), findFirst: vi.fn() },
    company: { findUnique: vi.fn().mockResolvedValue({ id: COMPANY, name: 'Innovation RH', legalName: 'Innovation RH Ltda', document: '00000000000100' }) },
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  };
  const calculator: any = { resolveTaxContext: vi.fn().mockResolvedValue(undefined) };
  const storage: any = {
    saveFile: vi.fn().mockResolvedValue('/data/trct.pdf'),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    getFileStream: vi.fn(),
  };
  const service = new TerminationService(prisma, calculator, storage);
  return { service, prisma, tx, storage, calculator, getStored: () => stored };
}

describe('finalize — fluxo simular → efetivar', () => {
  it('grava o termo, desliga o funcionário, revoga o acesso, abre ASO demissional, audita e gera o TRCT', async () => {
    const f = fixture();
    const out = await f.service.finalize(COMPANY, actor, EMPLOYEE, dto);

    expect(f.tx.employee.updateMany).toHaveBeenCalledWith({
      where: { id: EMPLOYEE, companyId: COMPANY, status: { not: 'TERMINATED' } },
      data: { status: 'TERMINATED', terminationDate: new Date('2026-10-20T00:00:00Z') },
    });
    const created = f.tx.terminationRecord.create.mock.calls[0][0].data;
    expect(created).toMatchObject({ companyId: COMPANY, employeeId: EMPLOYEE, type: 'SEM_JUSTA_CAUSA', finalizedBy: actor.sub });
    expect(created.netAmount).toBe(out.netAmount);
    expect(created.snapshot.earnings.length).toBeGreaterThan(0);
    expect(f.tx.refreshSession.deleteMany).toHaveBeenCalledWith({ where: { userId: '00000000-0000-0000-0000-0000000000b1' } });
    expect(f.tx.user.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: '00000000-0000-0000-0000-0000000000b1', companyId: COMPANY },
      data: { isActive: false, forcePasswordChange: true },
    });
    expect(f.tx.employeeAsoRecord.create.mock.calls[0][0].data).toMatchObject({ asoType: 'DEMISSIONAL', status: 'PENDING', companyId: COMPANY });
    expect(f.tx.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: 'TERMINATION_FINALIZED', entityId: EMPLOYEE, companyId: COMPANY });

    expect(f.storage.saveFile).toHaveBeenCalledTimes(1);
    expect(f.storage.saveFile.mock.calls[0][1].subarray(0, 4).toString('latin1')).toBe('%PDF');
    expect(out.documentId).toBe('doc-1');
    expect(out.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(out.documentPending).toBe(false);
  });

  it('exige confirmação explícita e não toca no banco sem ela', async () => {
    const f = fixture();
    await expect(f.service.finalize(COMPANY, actor, EMPLOYEE, { ...dto, confirm: 'sim' })).rejects.toBeInstanceOf(BadRequestException);
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('idempotência: funcionário já desligado → 409 sem gravar nada', async () => {
    const f = fixture({ employee: { status: 'TERMINATED' } });
    await expect(f.service.finalize(COMPANY, actor, EMPLOYEE, dto)).rejects.toBeInstanceOf(ConflictException);
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('idempotência sob concorrência: outra requisição desligou primeiro (updateMany=0) → 409 e nenhum termo criado', async () => {
    const f = fixture();
    f.tx.employee.updateMany.mockResolvedValue({ count: 0 });
    await expect(f.service.finalize(COMPANY, actor, EMPLOYEE, dto)).rejects.toBeInstanceOf(ConflictException);
    expect(f.tx.terminationRecord.create).not.toHaveBeenCalled();
    expect(f.tx.refreshSession.deleteMany).not.toHaveBeenCalled();
  });

  it('idempotência por constraint única (P2002) → 409', async () => {
    const f = fixture();
    f.tx.terminationRecord.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '6' }));
    await expect(f.service.finalize(COMPANY, actor, EMPLOYEE, dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('não permite efetivar a própria rescisão', async () => {
    const f = fixture({ employee: { userId: actor.sub } });
    await expect(f.service.finalize(COMPANY, actor, EMPLOYEE, dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('falha ao gerar o PDF não desfaz a rescisão: devolve documentPending e o termo permanece', async () => {
    const f = fixture();
    f.storage.saveFile.mockRejectedValue(new Error('disco cheio'));
    const out = await f.service.finalize(COMPANY, actor, EMPLOYEE, dto);
    expect(out.documentPending).toBe(true);
    expect(out.documentId).toBeNull();
    expect(f.getStored()).not.toBeNull();
  });
});

describe('isolamento por empresa (tenant)', () => {
  it('funcionário de outra empresa → 404; a busca sempre filtra por companyId', async () => {
    const f = fixture();
    f.prisma.employee.findFirst.mockResolvedValue(null);
    await expect(f.service.finalize(OTHER_COMPANY, { ...actor, companyId: OTHER_COMPANY }, EMPLOYEE, dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(f.prisma.employee.findFirst.mock.calls[0][0].where).toEqual({ id: EMPLOYEE, companyId: OTHER_COMPANY });
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('simulate usa a empresa do token; consulta de fechamentos e férias também é escopada', async () => {
    const f = fixture();
    await f.service.simulate(COMPANY, { ...dto, employeeId: EMPLOYEE });
    expect(f.prisma.timeClosing.findMany.mock.calls[0][0].where).toMatchObject({ companyId: COMPANY, employeeId: EMPLOYEE, status: { in: ['APPROVED', 'CLOSED'] } });
    expect(f.prisma.vacationEntitlement.findMany.mock.calls[0][0].where).toMatchObject({ employee: { companyId: COMPANY } });
  });

  it('getRecord filtra por empresa e devolve 404 sem termo', async () => {
    const f = fixture();
    f.prisma.terminationRecord.findFirst.mockResolvedValue(null);
    await expect(f.service.getRecord(OTHER_COMPANY, EMPLOYEE)).rejects.toBeInstanceOf(NotFoundException);
    expect(f.prisma.terminationRecord.findFirst.mock.calls[0][0].where).toEqual({ companyId: OTHER_COMPANY, employeeId: EMPLOYEE });
  });
});

describe('média de variáveis no serviço', () => {
  const closings = ['2025-10-31', '2025-11-30', '2025-12-31', '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30', '2026-07-31', '2026-08-31', '2026-09-30'].map((periodEnd) => ({
    periodEnd: new Date(`${periodEnd}T00:00:00Z`), overtime50Value: 150, overtime100Value: 0, nightShiftValue: 0, dsrValue: 30, hourlyRate: 3000 / 220, monthlyDivisor: 220,
  }));
  const sim = { ...dto, employeeId: EMPLOYEE };

  it('automática: média de 180/mês entra no aviso (33 dias × (3.000+180)/30 = 3.498)', async () => {
    const f = fixture({ employee: { admissionDate: new Date('2025-10-20T00:00:00Z') }, closings });
    const out = await f.service.simulate(COMPANY, sim);
    expect(out.variableAverage).toMatchObject({ source: 'AUTO', monthly: 180, closingsFound: 12, monthsConsidered: 12 });
    expect(out.earnings.find((l: any) => l.code === 'AVISO_INDENIZADO')?.amount).toBe(3498);
  });

  it('override manual substitui a automática e não consulta fechamentos', async () => {
    const f = fixture({ employee: { admissionDate: new Date('2025-10-20T00:00:00Z') }, closings });
    const out = await f.service.simulate(COMPANY, { ...sim, variableAverageOverride: 300 });
    expect(out.variableAverage.source).toBe('MANUAL');
    expect(out.earnings.find((l: any) => l.code === 'AVISO_INDENIZADO')?.amount).toBe(3630);
    expect(f.prisma.timeClosing.findMany).not.toHaveBeenCalled();
  });

  it('includeVariableAverage=false desliga a média', async () => {
    const f = fixture({ employee: { admissionDate: new Date('2025-10-20T00:00:00Z') }, closings });
    const out = await f.service.simulate(COMPANY, { ...sim, includeVariableAverage: false });
    expect(out.variableAverage.source).toBe('NONE');
    expect(out.earnings.find((l: any) => l.code === 'AVISO_INDENIZADO')?.amount).toBe(3300);
  });
});

describe('TRCT em PDF', () => {
  it('termo já emitido: serve o arquivo original e o hash gravado (não regera)', async () => {
    const f = fixture();
    f.prisma.terminationRecord.findFirst.mockResolvedValue({ id: 'rec-1', employeeId: EMPLOYEE, documentId: 'doc-9', sha256: 'a'.repeat(64) });
    f.prisma.generatedDocument.findFirst.mockResolvedValue({ id: 'doc-9', storageKey: 'trct-x.pdf', sha256: 'a'.repeat(64), title: 'TRCT TRCT-202610-ABCD' });
    f.storage.getFileStream.mockResolvedValue(Readable.from([Buffer.from('%PDF-original')]));
    const out = await f.service.trctPdf(COMPANY, actor, EMPLOYEE);
    expect(out.sha256).toBe('a'.repeat(64));
    expect(out.buffer.toString()).toBe('%PDF-original');
    expect(f.storage.saveFile).not.toHaveBeenCalled();
    expect(f.prisma.generatedDocument.findFirst.mock.calls[0][0].where).toEqual({ id: 'doc-9', companyId: COMPANY });
  });
});

describe('permissões do controller (RolesGuard)', () => {
  const guard = new RolesGuard(new Reflector());
  const ctxFor = (role: string, handler: Function) =>
    ({ getHandler: () => handler, getClass: () => TerminationController, switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }) }) as unknown as ExecutionContext;

  for (const handler of ['finalize', 'record', 'trct', 'simulate'] as const) {
    it(`${handler}: FUNCIONARIO, GESTOR e CONSULTA recebem 403`, () => {
      for (const role of ['FUNCIONARIO', 'GESTOR', 'CONSULTA']) {
        expect(() => guard.canActivate(ctxFor(role, TerminationController.prototype[handler]))).toThrow(ForbiddenException);
      }
    });
  }

  it('ADMIN, RH e DEV passam', () => {
    for (const role of ['ADMIN', 'RH', 'DEV']) {
      expect(guard.canActivate(ctxFor(role, TerminationController.prototype.finalize))).toBe(true);
    }
  });
});
