import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { UpdateVacationStatusDto } from './dto/update-vacation-status.dto';
import { VacationsRepository } from './vacations.repository';

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

    // REGRA: Elegibilidade - 12 meses de casa
    const now = new Date();
    const admissionDate = new Date(employee.admissionDate);
    const monthsSinceAdmission = this.monthDiff(admissionDate, now);

    if (monthsSinceAdmission < 12) {
      // Calcular contador regressivo: quando exatamente completa 12 meses
      const eligibilityDate = new Date(admissionDate);
      eligibilityDate.setFullYear(eligibilityDate.getFullYear() + 1);
      const remainingMs = eligibilityDate.getTime() - now.getTime();
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

      const years = Math.floor(remainingDays / 365);
      const months = Math.floor((remainingDays % 365) / 30);
      const days = remainingDays - (years * 365) - (months * 30);

      throw new BadRequestException(
        `Colaborador ainda nao completou 12 meses de empresa desde a admissao (${admissionDate.toISOString().slice(0, 10)}). ` +
        `Faltam ${years > 0 ? `${years} anos, ` : ''}${months} mes(es) e ${days} dia(s) para adquirir o direito.`
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) throw new BadRequestException('End date must be after start date');

    // REGRA: Calcular faltas injustificadas do período aquisitivo
    const acquisitionYear = parseInt(dto.acquisitionPeriod.split('/')[0], 10);
    const periodStart = new Date(acquisitionYear, 0, 1); // Janeiro do ano aquisitivo
    const periodEnd = new Date(acquisitionYear + 1, 0, 1); // Janeiro do ano seguinte

    // Faltas injustificadas = days without any time track entry
    const allTracks = await this.repository.listTimeTracksInPeriod(dto.employeeId, periodStart, periodEnd);

    // Contar dias úteis sem batida de ponto
    const unjustifiedAbsences = this.countUnjustifiedAbsences(allTracks, periodStart, periodEnd, employee.workScale || undefined);

    // Calcular desconto CLT:
    // Até 5 faltas: sem desconto
    // 6 a 14 faltas: perde 1/3 das férias
    // 15 a 23 faltas: perde 2/3
    // 24 a 31 faltas: perde 3/3 (não tem direito)
    let cltDiscount = 0;
    if (unjustifiedAbsences >= 6 && unjustifiedAbsences <= 14) cltDiscount = Math.ceil(30 / 3); // 10 dias
    else if (unjustifiedAbsences >= 15 && unjustifiedAbsences <= 23) cltDiscount = Math.ceil(30 * 2 / 3); // 20 dias
    else if (unjustifiedAbsences >= 24) cltDiscount = 30; // perde todas

    if (unjustifiedAbsences > 5) {
      const remainingDays = dto.daysUsed - cltDiscount;
      if (remainingDays <= 0) {
        throw new BadRequestException(
          `Colaborador possui ${unjustifiedAbsences} faltas injustificadas no período aquisitivo. ` +
          `Pela CLT, perde o direito a ferias (desconto de ${cltDiscount} dias). ` +
          `Regularize a situacao antes de solicitar.`
        );
      }
      // Anexar info de faltas na observação
      dto.observation = dto.observation
        ? `${dto.observation} | Faltas injustificadas no período: ${unjustifiedAbsences} (CLT: desconto de ${cltDiscount} dias)`
        : `Faltas injustificadas no período aquisitivo: ${unjustifiedAbsences} (CLT: desconto de ${cltDiscount} dias)`;
    }

    return this.repository.create({
      employeeId: dto.employeeId,
      acquisitionPeriod: dto.acquisitionPeriod,
      startDate,
      endDate,
      daysUsed: dto.daysUsed - cltDiscount, // Aplicar desconto CLT
      observation: dto.observation,
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

  // ─── UTILITIES ───────────────────────────────────────────────────────────

  private monthDiff(start: Date, end: Date): number {
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) +
      (end.getDate() >= start.getDate() ? 0 : -1);
  }

  private countUnjustifiedAbsences(
    tracks: { date: Date; entry?: Date | null; manualStatus?: string | null }[],
    periodStart: Date,
    periodEnd: Date,
    workScale?: string,
  ): number {
    let absences = 0;
    const cursor = new Date(periodStart);

    // Mapa de datas com ponto
    const trackDates = new Set<string>();
    for (const track of tracks) {
      const dateStr = this.toDateOnlyStr(track.date);
      trackDates.add(dateStr);
    }

    // Dias da semana de folga
    const daysOff = this.getDaysOff(workScale);

    while (cursor < periodEnd) {
      const weekday = cursor.getUTCDay();
      // Pular fins de semana e folgas
      if (daysOff.includes(weekday)) {
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        continue;
      }

      const dateStr = this.toDateOnlyStr(cursor);
      if (!trackDates.has(dateStr)) {
        absences++;
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return absences;
  }

  private getDaysOff(workScale?: string): number[] {
    if (workScale === '5X2') return [0, 6]; // domingo e sábado
    if (workScale === '6X1') return [0]; // domingo
    return [0]; // padrão: domingo
  }

  private toDateOnlyStr(date: Date): string {
    return date.toISOString().slice(0, 10);
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
    if (actor.role === 'FUNCIONÁRIO' && employee.id === actorEmployee.id) return employee;
    throw new ForbiddenException('Permissao insuficiente');
  }
}