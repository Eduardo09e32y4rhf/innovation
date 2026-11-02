import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { SupportStorageService } from '../support/support-storage.service';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';
import { FinalizeTerminationDto, SimulateTerminationDto, TerminationParamsDto } from './dto/termination.dto';
import { calculateTermination } from './termination.calculator';
import { buildTrctPdf, TRCT_VERSION } from './termination.pdf';
import { calculateThirteenth } from './thirteenth.calculator';
import { averageWindow, ClosingForAverage, computeVariableAverage, VariableAverageResult } from './variable-average';

export const FINALIZE_CONFIRMATION = 'EFETIVAR';

@Injectable()
export class TerminationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: PayrollCalculationService,
    private readonly storage: SupportStorageService,
  ) {}

  private async employee(companyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: {
        id: true, userId: true, name: true, cpf: true, registration: true, position: true,
        salary: true, dependents: true, admissionDate: true, terminationDate: true, status: true,
      },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');
    const salary = Number(employee.salary);
    if (!Number.isFinite(salary) || salary <= 0) {
      throw new BadRequestException(`${employee.name} está sem salário cadastrado. Informe o salário no cadastro do funcionário.`);
    }
    let raw: unknown = employee.dependents;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch { raw = null; }
    }
    return { ...employee, salary, dependents: Array.isArray(raw) ? raw.length : 0 };
  }

  private async variableAverage(
    companyId: string,
    employee: { id: string; salary: number; admissionDate: Date },
    dto: TerminationParamsDto,
  ): Promise<VariableAverageResult> {
    if (dto.variableAverageOverride != null) {
      return { monthly: dto.variableAverageOverride, monthsConsidered: 0, closingsFound: 0, source: 'MANUAL', warnings: [] };
    }
    const none: VariableAverageResult = { monthly: 0, monthsConsidered: 0, closingsFound: 0, source: 'NONE', warnings: [] };
    if (dto.includeVariableAverage === false) return none;
    const window = averageWindow(employee.admissionDate, dto.terminationDate);
    if (window.months === 0) return none;
    const rows = await this.prisma.timeClosing.findMany({
      where: {
        companyId,
        employeeId: employee.id,
        status: { in: ['APPROVED', 'CLOSED'] },
        periodEnd: { gte: window.from, lt: window.to },
      },
      select: {
        periodEnd: true, overtime50Value: true, overtime100Value: true, nightShiftValue: true,
        dsrValue: true, hourlyRate: true, monthlyDivisor: true,
      },
    });
    const closings: ClosingForAverage[] = rows.map((row) => ({
      periodEnd: row.periodEnd,
      overtime50Value: Number(row.overtime50Value),
      overtime100Value: Number(row.overtime100Value),
      nightShiftValue: Number(row.nightShiftValue),
      dsrValue: Number(row.dsrValue),
      hourlyRate: Number(row.hourlyRate),
      monthlyDivisor: row.monthlyDivisor,
    }));
    return computeVariableAverage(closings, { salary: employee.salary, admission: employee.admissionDate, termination: dto.terminationDate });
  }

  private async compute(companyId: string, employeeId: string, dto: TerminationParamsDto) {
    const employee = await this.employee(companyId, employeeId);
    const taxContext = await this.calculator.resolveTaxContext(new Date(`${dto.terminationDate.slice(0, 10)}T12:00:00Z`));
    const variable = await this.variableAverage(companyId, employee, dto);
    let vacationHistory;
    if (dto.vestedVacationPeriods == null) {
      vacationHistory = await this.prisma.vacationEntitlement.findMany({
        where: { employeeId: employee.id, employee: { companyId }, status: { not: 'CANCELLED' } },
        select: { acquisitionStart: true, entitledDays: true, usedDays: true, soldDays: true, concessionEnd: true },
      });
    }
    try {
      const result = calculateTermination({
        type: dto.type,
        noticeMode: dto.noticeMode,
        contractEndDate: dto.contractEndDate,
        vestedVacationPeriods: dto.vestedVacationPeriods,
        thirteenthAdvancePaid: dto.thirteenthAdvancePaid,
        fgtsBalance: dto.fgtsBalance,
        terminationDate: dto.terminationDate,
        salary: employee.salary,
        admissionDate: employee.admissionDate,
        dependents: employee.dependents,
        taxContext,
        variableMonthly: variable.monthly,
        vacationHistory,
      });
      result.warnings.push(...variable.warnings);
      return {
        employee,
        result,
        variableAverage: {
          source: variable.source,
          monthly: variable.monthly,
          monthsConsidered: variable.monthsConsidered,
          closingsFound: variable.closingsFound,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException((error as Error).message);
    }
  }

  async simulate(companyId: string, dto: SimulateTerminationDto) {
    const { employee, result, variableAverage } = await this.compute(companyId, dto.employeeId, dto);
    return { employee: { id: employee.id, name: employee.name }, ...result, variableAverage, simulation: true };
  }

  async finalize(companyId: string, actor: JwtUser, employeeId: string, dto: FinalizeTerminationDto) {
    if (dto.confirm !== FINALIZE_CONFIRMATION) {
      throw new BadRequestException(`Confirme enviando { "confirm": "${FINALIZE_CONFIRMATION}" }.`);
    }
    const { employee, result, variableAverage } = await this.compute(companyId, employeeId, dto);
    if (employee.status === 'TERMINATED') throw new ConflictException('Funcionário já está desligado; a rescisão não pode ser efetivada de novo.');
    if (employee.userId && employee.userId === actor.sub) throw new BadRequestException('Você não pode efetivar a própria rescisão.');

    const terminationDate = new Date(`${dto.terminationDate.slice(0, 10)}T00:00:00Z`);
    const snapshot = {
      ...result,
      terminationDate: dto.terminationDate.slice(0, 10),
      variableAverage,
      parameters: {
        noticeMode: dto.noticeMode ?? null,
        contractEndDate: dto.contractEndDate ?? null,
        vestedVacationPeriods: dto.vestedVacationPeriods ?? null,
        thirteenthAdvancePaid: dto.thirteenthAdvancePaid ?? null,
        fgtsBalance: dto.fgtsBalance ?? null,
        variableAverageOverride: dto.variableAverageOverride ?? null,
        includeVariableAverage: dto.includeVariableAverage ?? true,
      },
      finalizedAt: new Date().toISOString(),
      finalizedBy: actor.sub,
    };

    let record;
    try {
      record = await this.prisma.$transaction(async (tx) => {
        const moved = await tx.employee.updateMany({
          where: { id: employee.id, companyId, status: { not: 'TERMINATED' } },
          data: { status: 'TERMINATED', terminationDate },
        });
        if (moved.count === 0) throw new ConflictException('Funcionário já está desligado; a rescisão não pode ser efetivada de novo.');

        const created = await tx.terminationRecord.create({
          data: {
            companyId,
            employeeId: employee.id,
            type: result.type,
            noticeMode: result.noticeMode,
            terminationDate,
            totalEarnings: result.totalEarnings,
            totalDiscounts: result.totalDiscounts,
            netAmount: result.netAmount,
            fgtsFine: result.fgts.fine,
            paymentDeadline: new Date(`${result.paymentDeadline}T00:00:00Z`),
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            finalizedBy: actor.sub,
          },
        });

        if (employee.userId) {
          await tx.refreshSession.deleteMany({ where: { userId: employee.userId } });
          await tx.user.updateMany({
            where: { id: employee.userId, companyId },
            data: { isActive: false, forcePasswordChange: true, passwordChangedAt: new Date(), blockedAt: new Date(), blockedReason: 'Rescisão efetivada' },
          });
        }

        const pendingAso = await tx.employeeAsoRecord.findFirst({
          where: { companyId, employeeId: employee.id, asoType: 'DEMISSIONAL' },
          select: { id: true },
        });
        if (!pendingAso) {
          await tx.employeeAsoRecord.create({
            data: { companyId, employeeId: employee.id, asoType: 'DEMISSIONAL', status: 'PENDING', createdBy: actor.sub },
          });
        }

        await tx.auditLog.create({
          data: {
            companyId, userId: actor.sub, action: 'TERMINATION_FINALIZED', entity: 'Employee', entityId: employee.id,
            metadata: { recordId: created.id, type: result.type, netAmount: result.netAmount, terminationDate: dto.terminationDate.slice(0, 10) } as any,
          },
        });
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Esta rescisão já foi efetivada.');
      }
      throw error;
    }

    let document: { documentId: string; sha256: string } | null = null;
    try {
      document = await this.storePdf(companyId, actor, record.id);
    } catch {
      document = null;
    }
    return {
      id: record.id,
      employee: { id: employee.id, name: employee.name },
      ...result,
      variableAverage,
      documentId: document?.documentId ?? null,
      sha256: document?.sha256 ?? null,
      documentPending: !document,
    };
  }

  async getRecord(companyId: string, employeeId: string) {
    const record = await this.prisma.terminationRecord.findFirst({
      where: { companyId, employeeId },
      orderBy: { terminationDate: 'desc' },
    });
    if (!record) throw new NotFoundException('Nenhuma rescisão efetivada para este funcionário.');
    return {
      id: record.id,
      employeeId: record.employeeId,
      type: record.type,
      terminationDate: record.terminationDate.toISOString().slice(0, 10),
      totalEarnings: Number(record.totalEarnings),
      totalDiscounts: Number(record.totalDiscounts),
      netAmount: Number(record.netAmount),
      fgtsFine: Number(record.fgtsFine),
      paymentDeadline: record.paymentDeadline.toISOString().slice(0, 10),
      documentId: record.documentId,
      sha256: record.sha256,
      createdAt: record.createdAt,
      snapshot: record.snapshot,
    };
  }

  /** Renderiza o TRCT a partir do snapshot e registra o documento (uma única vez por rescisão). */
  private async storePdf(companyId: string, actor: JwtUser, recordId: string) {
    const existing = await this.prisma.terminationRecord.findFirst({ where: { id: recordId, companyId } });
    if (!existing) throw new NotFoundException('Rescisão não encontrada.');
    if (existing.documentId && existing.sha256) return { documentId: existing.documentId, sha256: existing.sha256, built: null };

    const built = await this.renderPdf(companyId, actor, recordId);
    const sha256 = createHash('sha256').update(built.buffer).digest('hex');
    const storageKey = `trct-${companyId}-${recordId}-${sha256.slice(0, 12)}.pdf`;
    await this.storage.saveFile(storageKey, built.buffer);
    try {
      const document = await this.prisma.generatedDocument.create({
        data: {
          companyId,
          type: 'OTHER',
          title: `TRCT ${built.identifier}`,
          storageKey,
          sha256,
          sizeBytes: built.buffer.length,
          createdBy: actor.sub,
          metadata: { documentKind: 'TRCT', version: TRCT_VERSION, identifier: built.identifier, recordId, employeeId: existing.employeeId } as Prisma.InputJsonValue,
        },
      });
      await this.prisma.terminationRecord.update({ where: { id: recordId }, data: { documentId: document.id, sha256 } });
      return { documentId: document.id, sha256, built };
    } catch (error) {
      await this.storage.deleteFile(storageKey);
      throw error;
    }
  }

  private async renderPdf(companyId: string, actor: JwtUser, recordId: string) {
    const record = await this.prisma.terminationRecord.findFirst({ where: { id: recordId, companyId } });
    if (!record) throw new NotFoundException('Rescisão não encontrada.');
    const [company, employee] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId } }),
      this.prisma.employee.findFirst({
        where: { id: record.employeeId, companyId },
        select: { name: true, cpf: true, registration: true, position: true, admissionDate: true },
      }),
    ]);
    if (!company || !employee) throw new NotFoundException('Dados da rescisão não encontrados.');
    const identifier = `TRCT-${record.terminationDate.toISOString().slice(0, 7).replace('-', '')}-${record.id.slice(0, 8).toUpperCase()}`;
    const buffer = await buildTrctPdf({
      identifier,
      issuedAt: new Date(),
      issuer: actor.name?.trim() || actor.email,
      company: company as any,
      employee,
      snapshot: record.snapshot,
    });
    return { buffer, identifier, filename: `trct-${identifier.toLowerCase()}.pdf`, employeeId: record.employeeId };
  }

  async trctPdf(companyId: string, actor: JwtUser, employeeId: string) {
    const record = await this.prisma.terminationRecord.findFirst({
      where: { companyId, employeeId },
      orderBy: { terminationDate: 'desc' },
      select: { id: true },
    });
    if (!record) throw new NotFoundException('Nenhuma rescisão efetivada para este funcionário.');
    const stored = await this.storePdf(companyId, actor, record.id);
    if (stored.built) return { buffer: stored.built.buffer, filename: stored.built.filename, documentId: stored.documentId, sha256: stored.sha256 };

    // Documento já emitido: serve o arquivo original, para que o hash publicado continue valendo.
    const doc = await this.prisma.generatedDocument.findFirst({ where: { id: stored.documentId, companyId } });
    if (!doc) throw new NotFoundException('Documento da rescisão não encontrado.');
    const chunks: Buffer[] = [];
    for await (const chunk of await this.storage.getFileStream(doc.storageKey)) chunks.push(Buffer.from(chunk as Buffer));
    return { buffer: Buffer.concat(chunks), filename: `${doc.title.toLowerCase().replace(/\s+/g, '-')}.pdf`, documentId: doc.id, sha256: doc.sha256 };
  }

  async thirteenth(companyId: string, employeeId: string, year: number) {
    const employee = await this.employee(companyId, employeeId);
    const taxContext = await this.calculator.resolveTaxContext(new Date(Date.UTC(year, 11, 20, 12)));
    const result = calculateThirteenth({
      year,
      salary: employee.salary,
      admissionDate: employee.admissionDate,
      terminationDate: employee.terminationDate,
      dependents: employee.dependents,
      taxContext,
    });
    return { employee: { id: employee.id, name: employee.name }, ...result };
  }
}
