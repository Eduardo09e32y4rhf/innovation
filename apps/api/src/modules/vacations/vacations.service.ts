import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { UpdateVacationStatusDto } from './dto/update-vacation-status.dto';
import { VacationsRepository } from './vacations.repository';
import { getDaysOffByScale } from '../../common/utils/work-schedule.utils';
import { toDateOnlyStr } from '../../common/utils/date.utils';
import { CreateMedicalCertificateDto } from './dto/create-medical-certificate.dto';
import { RecordVacationPaymentDto } from './dto/record-vacation-payment.dto';
import { UpdateMedicalCertificateStatusDto } from './dto/update-medical-certificate-status.dto';
import { VacationReceiptService } from './vacation-receipt.service';

@Injectable()
export class VacationsService {
  constructor(
    private readonly repository: VacationsRepository,
    private readonly receiptService?: VacationReceiptService,
  ) {}

  async list(companyId: string, actor: JwtUser) {
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV' || actor.role === 'CONSULTA') {
      return this.repository.list(companyId);
    }
    if (actor.role === 'GESTOR') {
      return this.repository.listForManager(companyId, actor.sub, actor.email);
    }
    return this.repository.listForEmployee(companyId, actor.sub, actor.email);
  }

  async listByEmployee(companyId: string, actor: JwtUser, employeeId: string) {
    await this.ensureCanAccessEmployee(companyId, actor, employeeId);
    return this.repository.listByEmployee(companyId, employeeId);
  }

  async listEntitlements(companyId: string, actor: JwtUser, employeeId: string) {
    await this.ensureCanAccessEmployee(companyId, actor, employeeId);
    return this.repository.listEntitlements(companyId, employeeId);
  }

  async create(companyId: string, actor: JwtUser, dto: CreateVacationDto) {
    await this.ensureCanAccessEmployee(companyId, actor, dto.employeeId);
    const employee = await this.repository.findEmployee(companyId, dto.employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    const now = new Date();
    const admissionDate = new Date(employee.admissionDate);
    const monthsSinceAdmission = this.monthDiff(admissionDate, now);
    if (monthsSinceAdmission < 12) {
      const eligibilityDate = new Date(admissionDate);
      eligibilityDate.setFullYear(eligibilityDate.getFullYear() + 1);
      const remainingMs = eligibilityDate.getTime() - now.getTime();
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      const years = Math.floor(remainingDays / 365);
      const months = Math.floor((remainingDays % 365) / 30);
      const days = remainingDays - years * 365 - months * 30;

      throw new BadRequestException(
        `Colaborador ainda nao completou 12 meses de empresa desde a admissao (${admissionDate.toISOString().slice(0, 10)}). ` +
        `Faltam ${years > 0 ? `${years} anos, ` : ''}${months} mes(es) e ${days} dia(s) para adquirir o direito.`,
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Informe datas de ferias validas.');
    }
    if (endDate < startDate) throw new BadRequestException('End date must be after start date');

    const requestedDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    if (requestedDays < 1 || requestedDays > 30) {
      throw new BadRequestException('O periodo de ferias deve ter entre 1 e 30 dias corridos.');
    }
    if (dto.daysUsed > requestedDays || dto.daysUsed > 30) {
      throw new BadRequestException('Os dias utilizados nao podem exceder o periodo informado nem 30 dias.');
    }
    if (await this.repository.findOverlapping(companyId, dto.employeeId, startDate, endDate)) {
      throw new BadRequestException('Ja existe uma solicitacao de ferias aprovada ou pendente neste periodo.');
    }

    if (!/^\d{4}\/\d{4}$/.test(dto.acquisitionPeriod)) {
      throw new BadRequestException('Periodo aquisitivo invalido. Use YYYY/YYYY.');
    }

    const vacationWindow = this.resolveVacationWindow(employee.admissionDate, startDate);
    const periodStart = vacationWindow.periodStart;
    const periodEnd = vacationWindow.periodEnd;

    const allTracks = await this.repository.listTimeTracksInPeriod(companyId, dto.employeeId, periodStart, periodEnd);
    const unjustifiedAbsences = this.countUnjustifiedAbsences(
      allTracks,
      periodStart,
      periodEnd,
      employee.admissionDate,
      employee.workScale || undefined,
    );

    const entitledDays = this.vacationEntitlementFromAbsences(unjustifiedAbsences);
    if (entitledDays <= 0) {
      throw new BadRequestException(
        `Colaborador possui ${unjustifiedAbsences} faltas injustificadas no periodo aquisitivo e perdeu o direito a ferias. ` +
        'Regularize a situacao antes de solicitar.',
      );
    }
    const soldDays = dto.soldDays ?? 0;
    if (soldDays > Math.floor(entitledDays / 3)) {
      throw new BadRequestException(`O abono pecuniario nao pode exceder ${Math.floor(entitledDays / 3)} dia(s) neste ciclo.`);
    }
    if (dto.daysUsed + soldDays > entitledDays) {
      throw new BadRequestException(
        `Colaborador possui ${unjustifiedAbsences} faltas injustificadas no periodo aquisitivo. ` +
        `Pela CLT, o direito disponivel e de ${entitledDays} dia(s) neste ciclo.`,
      );
    }

    const currentEntitlement = await this.repository.findEntitlement(
      companyId,
      dto.employeeId,
      periodStart,
      periodEnd,
    );
    if ((currentEntitlement?.vacations.length ?? 0) >= 3) {
      throw new BadRequestException('O periodo aquisitivo ja possui o limite de tres fracionamentos.');
    }
    if (dto.daysUsed < 5) {
      throw new BadRequestException('Cada periodo fracionado de ferias deve possuir pelo menos 5 dias corridos.');
    }
    const periods = [...(currentEntitlement?.vacations ?? []), { daysUsed: dto.daysUsed }];
    if (periods.length === 3 && !periods.some((period) => period.daysUsed >= 14)) {
      throw new BadRequestException('Ao concluir o fracionamento, pelo menos um periodo deve possuir 14 dias corridos.');
    }

    const paymentDueDate = new Date(startDate);
    paymentDueDate.setUTCDate(paymentDueDate.getUTCDate() - 2);
    const observation = dto.observation
      ? `${dto.observation} | Faltas injustificadas no periodo aquisitivo: ${unjustifiedAbsences} (direito CLT: ${entitledDays} dia(s))`
      : `Faltas injustificadas no periodo aquisitivo: ${unjustifiedAbsences} (direito CLT: ${entitledDays} dia(s))`;
    try {
      return await this.repository.reserveAndCreate({
        employeeId: dto.employeeId,
        acquisitionPeriod: vacationWindow.label,
        startDate,
        endDate,
        daysUsed: dto.daysUsed,
        soldDays,
        paymentDueDate,
        observation,
        actorUserId: actor.sub,
        entitlement: {
          acquisitionStart: periodStart,
          acquisitionEnd: periodEnd,
          concessionStart: vacationWindow.concessionStart,
          concessionEnd: vacationWindow.concessionEnd,
          entitledDays,
          unjustifiedAbsences,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.startsWith('VACATION_BALANCE:')) {
        const available = message.split(':')[1];
        throw new BadRequestException(`Saldo insuficiente neste periodo aquisitivo. Disponivel: ${available} dia(s).`);
      }
      throw error;
    }
  }

  async updateStatus(companyId: string, actor: JwtUser, id: string, dto: UpdateVacationStatusDto) {
    if (actor.role !== 'ADMIN' && actor.role !== 'RH' && actor.role !== 'DEV') {
      throw new ForbiddenException('Apenas RH pode autorizar ou negar ferias.');
    }

    const vacation = await this.repository.findById(companyId, id);
    if (!vacation) throw new NotFoundException('Vacation request not found');
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
      APPROVED: ['COMPLETED', 'CANCELLED'],
      REJECTED: [],
      CANCELLED: [],
      COMPLETED: [],
    };
    if (
      vacation.status !== dto.status
      && !(allowedTransitions[vacation.status] ?? []).includes(dto.status)
    ) {
      throw new BadRequestException(
        `Transicao de ferias invalida: ${vacation.status} para ${dto.status}.`,
      );
    }

    const result = await this.repository.updateStatusWithLedger(
      companyId,
      id,
      dto.status,
      dto.observation,
      actor.sub,
    );
    if (!result) throw new NotFoundException('Vacation request not found');
    return result;
  }

  async recordPayment(
    companyId: string,
    actor: JwtUser,
    vacationId: string,
    dto: RecordVacationPaymentDto,
  ) {
    if (actor.role !== 'ADMIN' && actor.role !== 'RH' && actor.role !== 'DEV') {
      throw new ForbiddenException('Apenas RH pode registrar pagamento de ferias.');
    }
    const vacation = await this.repository.findById(companyId, vacationId);
    if (!vacation) throw new NotFoundException('Vacation request not found');
    const dueDate = new Date(dto.dueDate);
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : undefined;
    const status = dto.status ?? (paidAt ? 'PAID' : 'PENDING');
    if (status === 'PAID' && !paidAt) {
      throw new BadRequestException('Informe a data do pagamento para marcar como pago.');
    }
    const payment = await this.repository.recordPayment(companyId, vacationId, {
      amount: dto.amount,
      dueDate,
      paidAt,
      status,
      paymentMethod: dto.paymentMethod,
      reference: dto.reference,
      actorUserId: actor.sub,
    });
    if (!payment) throw new NotFoundException('Vacation request not found');
    return payment;
  }

  async generateReceiptPdf(companyId: string, actor: JwtUser, id: string) {
    const vacation = await this.repository.findById(companyId, id);
    if (!vacation) throw new NotFoundException('Solicitacao de ferias nao encontrada.');
    await this.ensureCanAccessEmployee(companyId, actor, vacation.employeeId);
    if (!this.receiptService) throw new BadRequestException('Servico de recibo de ferias indisponivel.');
    return this.receiptService.generate(companyId, actor, vacation);
  }

  async listMedicalCertificates(companyId: string, actor: JwtUser, employeeId?: string) {
    if (employeeId) {
      await this.ensureCanAccessEmployee(companyId, actor, employeeId);
      return this.repository.listMedicalCertificates(companyId, employeeId);
    }
    if (actor.role !== 'ADMIN' && actor.role !== 'RH' && actor.role !== 'DEV') {
      const employee = await this.repository.findEmployeeByUserId(companyId, actor.sub, actor.email);
      if (!employee) throw new ForbiddenException('Permissao insuficiente');
      return this.repository.listMedicalCertificates(companyId, employee.id);
    }
    return this.repository.listMedicalCertificates(companyId);
  }

  async createMedicalCertificate(companyId: string, actor: JwtUser, dto: CreateMedicalCertificateDto) {
    await this.ensureCanAccessEmployee(companyId, actor, dto.employeeId);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) throw new BadRequestException('O fim da cobertura deve ser posterior ao inicio.');
    if (!dto.documentId?.trim()) throw new BadRequestException('O documento do atestado e obrigatorio.');
    const durationMinutes = Math.ceil((endAt.getTime() - startAt.getTime()) / 60000);
    if (dto.coveredMinutes > durationMinutes) {
      throw new BadRequestException('Os minutos cobertos nao podem exceder o periodo informado.');
    }
    if (dto.certificateType === 'HOURS' && toDateOnlyStr(startAt) !== toDateOnlyStr(endAt)) {
      throw new BadRequestException('Atestado por horas deve iniciar e terminar no mesmo dia.');
    }
    return this.repository.createMedicalCertificate({
      companyId,
      employeeId: dto.employeeId,
      certificateType: dto.certificateType,
      startAt,
      endAt,
      coveredMinutes: dto.coveredMinutes,
      issueDate: new Date(dto.issueDate),
      issuerName: dto.issuerName,
      issuerRegistration: dto.issuerRegistration,
      documentId: dto.documentId.trim(),
      createdByUserId: actor.sub,
    });
  }

  async updateMedicalCertificateStatus(
    companyId: string,
    actor: JwtUser,
    id: string,
    dto: UpdateMedicalCertificateStatusDto,
  ) {
    if (actor.role !== 'ADMIN' && actor.role !== 'RH' && actor.role !== 'DEV') {
      throw new ForbiddenException('Apenas RH pode revisar atestados.');
    }
    const certificate = await this.repository.findMedicalCertificate(companyId, id);
    if (!certificate) throw new NotFoundException('Atestado nao encontrado.');
    if (dto.status === 'REJECTED' && !dto.reason?.trim()) {
      throw new BadRequestException('Informe o motivo da rejeicao.');
    }
    const result = await this.repository.updateMedicalCertificateStatus(companyId, id, {
      status: dto.status,
      rejectionReason: dto.reason?.trim(),
      reviewedByUserId: actor.sub,
      reviewedAt: new Date(),
    });
    if (!result.count) throw new NotFoundException('Atestado nao encontrado.');
    return this.repository.findMedicalCertificate(companyId, id);
  }

  private monthDiff(start: Date, end: Date): number {
    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      (end.getDate() >= start.getDate() ? 0 : -1)
    );
  }

  private resolveVacationWindow(admissionDate: Date | string, vacationStartDate: Date) {
    const admission = new Date(admissionDate);
    const start = new Date(vacationStartDate);
    const monthsSinceAdmission = this.monthDiff(admission, start);

    if (monthsSinceAdmission < 12) {
      throw new BadRequestException(
        `Colaborador ainda nao completou 12 meses de empresa desde a admissao (${admission.toISOString().slice(0, 10)}).`,
      );
    }

    const completedCycles = Math.floor(monthsSinceAdmission / 12);
    const acquisitionCycleIndex = Math.max(0, completedCycles - 1);

    const periodStart = new Date(admission);
    periodStart.setMonth(periodStart.getMonth() + acquisitionCycleIndex * 12);

    const periodEnd = new Date(periodStart);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    periodEnd.setDate(periodEnd.getDate() - 1);

    const concessionEnd = new Date(periodEnd);
    concessionEnd.setFullYear(concessionEnd.getFullYear() + 1);
    const concessionStart = new Date(periodEnd);
    concessionStart.setDate(concessionStart.getDate() + 1);

    return {
      periodStart,
      periodEnd,
      concessionStart,
      concessionEnd,
      label: `${periodStart.toISOString().slice(0, 10)}/${periodEnd.toISOString().slice(0, 10)}`,
    };
  }

  private vacationEntitlementFromAbsences(unjustifiedAbsences: number): number {
    if (unjustifiedAbsences <= 5) return 30;
    if (unjustifiedAbsences <= 14) return 24;
    if (unjustifiedAbsences <= 23) return 18;
    if (unjustifiedAbsences <= 32) return 12;
    return 0;
  }

  private countUnjustifiedAbsences(
    tracks: { date: Date; entry?: Date | null; manualStatus?: string | null }[],
    periodStart: Date,
    periodEnd: Date,
    admissionDate?: Date | string | null,
    workScale?: string,
  ): number {
    let absences = 0;
    const admission = admissionDate ? new Date(admissionDate) : new Date(0);
    const startCursor = periodStart > admission ? periodStart : admission;
    const cursor = new Date(startCursor);
    const now = new Date();
    const endCursor = periodEnd < now ? periodEnd : now;

    const trackDates = new Set<string>();
    for (const track of tracks) {
      if (track.entry && track.manualStatus !== 'rejected' && track.manualStatus !== 'revoked') {
        trackDates.add(toDateOnlyStr(track.date));
      }
    }

    const daysOff = getDaysOffByScale(workScale);

    while (cursor < endCursor) {
      const weekday = cursor.getUTCDay();
      if (daysOff.includes(weekday)) {
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        continue;
      }

      if (!trackDates.has(toDateOnlyStr(cursor))) {
        absences++;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return absences;
  }

  private async ensureEmployee(companyId: string, employeeId: string) {
    const employee = await this.repository.findEmployee(companyId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  private async ensureCanAccessEmployee(companyId: string, actor: JwtUser, employeeId: string) {
    const employee = await this.ensureEmployee(companyId, employeeId);
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV' || actor.role === 'CONSULTA') return employee;
    const actorEmployee = await this.repository.findEmployeeByUserId(companyId, actor.sub, actor.email);
    if (!actorEmployee) throw new ForbiddenException('Permissao insuficiente');
    if (actor.role === 'GESTOR' && (employee.id === actorEmployee.id || employee.managerId === actorEmployee.id)) return employee;
    if (actor.role === 'FUNCIONARIO' && employee.id === actorEmployee.id) return employee;
    throw new ForbiddenException('Permissao insuficiente');
  }
}
