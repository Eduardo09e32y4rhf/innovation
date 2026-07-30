import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { UpdateVacationStatusDto } from './dto/update-vacation-status.dto';
import { VacationsRepository } from './vacations.repository';
import { getDaysOffByScale } from '../../common/utils/work-schedule.utils';
import { toDateOnlyStr } from '../../common/utils/date.utils';

@Injectable()
export class VacationsService {
  constructor(private readonly repository: VacationsRepository) {}

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
    if (dto.daysUsed > entitledDays) {
      throw new BadRequestException(
        `Colaborador possui ${unjustifiedAbsences} faltas injustificadas no periodo aquisitivo. ` +
        `Pela CLT, o direito disponivel e de ${entitledDays} dia(s) neste ciclo.`,
      );
    }

    return this.repository.create({
      employeeId: dto.employeeId,
      acquisitionPeriod: vacationWindow.label,
      startDate,
      endDate,
      daysUsed: dto.daysUsed,
      observation: dto.observation
        ? `${dto.observation} | Faltas injustificadas no periodo aquisitivo: ${unjustifiedAbsences} (direito CLT: ${entitledDays} dia(s))`
        : `Faltas injustificadas no periodo aquisitivo: ${unjustifiedAbsences} (direito CLT: ${entitledDays} dia(s))`,
    });
  }

  async updateStatus(companyId: string, actor: JwtUser, id: string, dto: UpdateVacationStatusDto) {
    if (actor.role !== 'ADMIN' && actor.role !== 'RH' && actor.role !== 'DEV') {
      throw new ForbiddenException('Apenas RH pode autorizar ou negar ferias.');
    }

    const vacation = await this.repository.findById(companyId, id);
    if (!vacation) throw new NotFoundException('Vacation request not found');

    const result = await this.repository.updateStatus(companyId, id, {
      status: dto.status,
      observation: dto.observation,
    });
    if (!result.count) throw new NotFoundException('Vacation request not found');
    return this.repository.findById(companyId, id);
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

    return {
      periodStart,
      periodEnd,
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
