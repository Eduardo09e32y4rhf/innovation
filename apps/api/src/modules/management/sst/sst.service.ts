import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AsoService } from '../aso.service';
import {
  asoState,
  computeDueDate,
  employeeCompliance,
  EXPIRING_WINDOW_DAYS,
  isRenewing,
  normalizePeriodicity,
  type ComplianceState,
} from './aso-rules';
import type { CompleteAsoDto } from './sst.dto';

const COMPLIANCE_ORDER: Record<ComplianceState, number> = { NO_ASO: 0, EXPIRED: 1, INAPTO: 2, EXPIRING: 3, VALID: 4 };

@Injectable()
export class SstService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asoService: AsoService,
  ) {}

  /** Situação de ASO de cada colaborador ativo da empresa. */
  private async complianceRows(companyId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { id: true, name: true, position: true, department: true, admissionDate: true },
      orderBy: { name: 'asc' },
    });
    const records = employees.length
      ? await this.prisma.employeeAsoRecord.findMany({
          where: { companyId, employeeId: { in: employees.map((e) => e.id) }, status: { not: 'CANCELLED' } },
          select: { id: true, employeeId: true, asoType: true, status: true, result: true, examDate: true, dueDate: true },
        })
      : [];
    const byEmployee = new Map<string, typeof records>();
    for (const r of records) {
      const list = byEmployee.get(r.employeeId);
      if (list) list.push(r);
      else byEmployee.set(r.employeeId, [r]);
    }
    const today = new Date();
    return employees.map((employee) => {
      const own = byEmployee.get(employee.id) ?? [];
      const compliance = employeeCompliance(own, today);
      const open = own.find((r) => r.status !== 'COMPLETED');
      return {
        employee: { ...employee, department: employee.department ?? null },
        state: compliance.state,
        dueDate: compliance.dueDate,
        daysLeft: compliance.daysLeft,
        openRecordId: open?.id ?? null,
      };
    });
  }

  /** Painel da Central de Gestão: números e fila de ação. */
  async overview(companyId: string) {
    const [rows, openAso, events] = await Promise.all([
      this.complianceRows(companyId),
      this.prisma.employeeAsoRecord.count({ where: { companyId, status: { in: ['PENDING', 'SCHEDULED', 'WAITING_DOCUMENT', 'WAITING_ADDITIONAL_EXAM'] } } }),
      this.prisma.managementEvent.count({
        where: { companyId, status: { not: 'CONCLUIDO' }, startDateTime: { gte: new Date(), lte: new Date(Date.now() + 7 * 86_400_000) } },
      }),
    ]);
    const count = (state: ComplianceState) => rows.filter((r) => r.state === state).length;
    const total = rows.length;
    const regular = count('VALID') + count('EXPIRING');
    const queue = rows
      .filter((r) => r.state !== 'VALID')
      .sort((a, b) => COMPLIANCE_ORDER[a.state] - COMPLIANCE_ORDER[b.state] || (a.daysLeft ?? -9999) - (b.daysLeft ?? -9999))
      .slice(0, 8);
    return {
      windowDays: EXPIRING_WINDOW_DAYS,
      aso: {
        total,
        valid: count('VALID'),
        expiring: count('EXPIRING'),
        expired: count('EXPIRED'),
        noAso: count('NO_ASO'),
        inapto: count('INAPTO'),
        open: openAso,
        regularPercent: total ? Math.round((regular / total) * 100) : 100,
      },
      agendaNext7Days: events,
      queue,
    };
  }

  /** Lista de colaboradores com situação de ASO, filtrável e paginada. */
  async compliance(companyId: string, filters: { state?: string; search?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(5, Number(filters.pageSize) || 25));
    const search = filters.search?.trim().toLowerCase();
    let rows = await this.complianceRows(companyId);
    if (filters.state && filters.state in COMPLIANCE_ORDER) rows = rows.filter((r) => r.state === filters.state);
    if (search) rows = rows.filter((r) => r.employee.name.toLowerCase().includes(search) || (r.employee.position ?? '').toLowerCase().includes(search));
    rows.sort((a, b) => COMPLIANCE_ORDER[a.state] - COMPLIANCE_ORDER[b.state] || (a.daysLeft ?? -9999) - (b.daysLeft ?? -9999) || a.employee.name.localeCompare(b.employee.name));
    return { total: rows.length, page, pageSize, items: rows.slice((page - 1) * pageSize, page * pageSize) };
  }

  /** Histórico de ASO de um colaborador, já com o estado de cada registro. */
  async history(companyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId }, select: { id: true, name: true, position: true } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');
    const records = await this.prisma.employeeAsoRecord.findMany({ where: { companyId, employeeId }, orderBy: [{ examDate: 'desc' }, { createdAt: 'desc' }] });
    const today = new Date();
    return { employee, records: records.map((r) => ({ ...r, state: asoState(r, today) })) };
  }

  /** Conclui um ASO: calcula o vencimento pela regra (não pelo cliente) e reaproveita a ativação da admissão. */
  async complete(companyId: string, id: string, actorId: string | undefined, dto: CompleteAsoDto) {
    const record = await this.prisma.employeeAsoRecord.findFirst({ where: { id, companyId } });
    if (!record) throw new NotFoundException('ASO não encontrado.');
    if (record.status === 'CANCELLED') throw new BadRequestException('Este ASO foi cancelado.');
    const examDate = new Date(dto.examDate);
    if (Number.isNaN(examDate.getTime())) throw new BadRequestException('Data do exame inválida.');
    if (examDate.getTime() > Date.now() + 86_400_000) throw new BadRequestException('A data do exame não pode estar no futuro.');
    if (dto.result === 'INAPTO' && !dto.restrictions?.trim() && !dto.observation?.trim()) {
      throw new BadRequestException('Informe o motivo da inaptidão nas observações.');
    }
    const periodicityMonths = normalizePeriodicity(dto.periodicityMonths);
    const dueDate = computeDueDate(record.asoType, examDate, periodicityMonths);
    return this.asoService.update(companyId, id, actorId, {
      status: 'COMPLETED',
      result: dto.result,
      examDate: examDate.toISOString(),
      dueDate: dueDate ? dueDate.toISOString() : null,
      clinicName: dto.clinicName,
      doctorName: dto.doctorName,
      documentNumber: dto.documentNumber,
      observation: dto.observation,
      periodicityMonths: isRenewing(record.asoType) ? periodicityMonths : null,
      restrictions: dto.restrictions,
      examsPerformed: dto.examsPerformed,
    });
  }
}
