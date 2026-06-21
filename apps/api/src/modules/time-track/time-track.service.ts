import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { BulkManualTimeTrackDto, ManualTimeTrackDto } from './dto/manual-time-track.dto';
import { RegisterTimeDto } from './dto/register-time.dto';
import { UpdateTimeTrackDto } from './dto/update-time-track.dto';
import { TimeTrackRepository } from './time-track.repository';

const STANDARD_WORKDAY_MINUTES = 8 * 60;
const REASON_LABEL: Record<string, string> = {
  ajuste_abono_atestado_horas: 'Ajuste - abono (atestado de horas)',
  ajuste_atestado_integral: 'Ajuste - atestado integral',
  ajuste_folga_dsr: 'Ajuste - folga DSR',
  ajuste_abono_folga: 'Ajuste abono - folga',
  ajuste_erro_marcacao: 'Ajuste - erro de marcação',
  ajuste_feriado: 'Ajuste - feriado',
};

@Injectable()
export class TimeTrackService {
  constructor(private readonly repository: TimeTrackRepository) {}

  async list(companyId: string, actor: JwtUser) {
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV') return this.repository.list(companyId);
    const employee = await this.repository.findEmployeeByUserId(companyId, actor.sub);
    if (!employee) return [];
    const { start, end } = this.resolveMonth();
    return this.repository.listEmployeeMonth(companyId, employee.id, start, end);
  }

  async listEmployeeMonth(companyId: string, actor: JwtUser, employeeId: string, month?: string) {
    await this.ensureCanAccessEmployee(companyId, actor, employeeId);
    const { start, end } = this.resolveMonth(month);
    return this.repository.listEmployeeMonth(companyId, employeeId, start, end);
  }

  async manual(companyId: string, dto: ManualTimeTrackDto) {
    await this.ensureEmployee(companyId, dto.employeeId);
    return this.applyManual(dto.employeeId, dto.date, dto);
  }

  async manualBulk(companyId: string, dto: BulkManualTimeTrackDto) {
    const dates = this.resolveBulkDates(dto);
    const created = [];
    for (const employeeId of dto.employeeIds) {
      const employee = await this.ensureEmployee(companyId, employeeId);
      for (const date of dates) {
        if (this.isRestDay(employee, date, dto)) continue;
        created.push(await this.applyManual(employeeId, date, dto));
      }
    }
    return { count: created.length, items: created };
  }

  async register(companyId: string, actor: JwtUser, dto: RegisterTimeDto) {
    await this.ensureCanAccessEmployee(companyId, actor, dto.employeeId);
    const timestamp = dto.timestamp ? new Date(dto.timestamp) : new Date();
    if (Number.isNaN(timestamp.getTime())) throw new BadRequestException('Invalid timestamp');
    const field = this.typeToField(dto.type);
    const current = await this.repository.upsert(dto.employeeId, this.toDateOnly(timestamp), {
      [field]: timestamp,
      observation: dto.observation,
    });
    const totals = this.calculateTotals({ ...current, [field]: timestamp });
    return this.repository.upsert(dto.employeeId, this.toDateOnly(timestamp), totals);
  }

  async update(companyId: string, id: string, dto: UpdateTimeTrackDto) {
    const current = await this.repository.findById(companyId, id);
    if (!current) throw new NotFoundException('Time track not found');
    const data = {
      ...(dto.entry !== undefined ? { entry: this.parseOptionalDate(dto.entry) } : {}),
      ...(dto.lunchStart !== undefined ? { lunchStart: this.parseOptionalDate(dto.lunchStart) } : {}),
      ...(dto.lunchReturn !== undefined ? { lunchReturn: this.parseOptionalDate(dto.lunchReturn) } : {}),
      ...(dto.exit !== undefined ? { exit: this.parseOptionalDate(dto.exit) } : {}),
      ...(dto.observation !== undefined ? { observation: dto.observation?.trim() || null } : {}),
    };
    const next = { ...current, ...data };
    const result = await this.repository.update(companyId, id, { ...data, ...this.calculateTotals(next) });
    if (!result.count) throw new NotFoundException('Time track not found');
    return this.repository.findById(companyId, id);
  }

  async delete(companyId: string, id: string) {
    const result = await this.repository.delete(companyId, id);
    if (!result.count) throw new NotFoundException('Time track not found');
    return { deleted: true };
  }

  private async applyManual(employeeId: string, dateValue: string, dto: Pick<ManualTimeTrackDto, 'entry' | 'lunchStart' | 'lunchReturn' | 'exit' | 'reason' | 'observation'>) {
    const date = this.toDateOnly(this.parseDate(dateValue, 'Invalid date'));
    const isFullDayAdjustment = dto.reason === 'ajuste_atestado_integral' || dto.reason === 'ajuste_feriado';
    const data = {
      entry: isFullDayAdjustment ? null : this.parseOptionalDate(dto.entry),
      lunchStart: isFullDayAdjustment ? null : this.parseOptionalDate(dto.lunchStart),
      lunchReturn: isFullDayAdjustment ? null : this.parseOptionalDate(dto.lunchReturn),
      exit: isFullDayAdjustment ? null : this.parseOptionalDate(dto.exit),
      observation: this.buildObservation(dto.reason, dto.observation),
    };
    const totals = this.calculateTotals(data);
    return this.repository.upsert(employeeId, date, { ...data, ...totals });
  }

  private resolveBulkDates(dto: BulkManualTimeTrackDto) {
    if (dto.date) return [dto.date];
    if (!dto.startDate || !dto.endDate) throw new BadRequestException('Invalid date range');
    const start = this.toDateOnly(this.parseDate(dto.startDate, 'Invalid start date'));
    const end = this.toDateOnly(this.parseDate(dto.endDate, 'Invalid end date'));
    if (start > end) throw new BadRequestException('Invalid date range');
    const dates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      dates.push(cursor.toISOString());
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      if (dates.length > 31) throw new BadRequestException('Bulk range cannot exceed 31 days');
    }
    return dates;
  }

  private isRestDay(employee: { workScale?: string | null }, dateValue: string, dto: BulkManualTimeTrackDto) {
    const date = this.toDateOnly(this.parseDate(dateValue, 'Invalid date'));
    const weekday = date.getUTCDay();
    const daysOff = dto.daysOff ?? this.defaultDaysOff(employee.workScale);

    if ((dto.restDayMode ?? 'employee_scale') === 'cycle') {
      return this.isCycleRestDay(date, dto, employee.workScale);
    }

    if ((dto.restDayMode ?? 'employee_scale') === 'fixed_weekly' || daysOff.length > 0) {
      return daysOff.includes(weekday);
    }

    return false;
  }

  private defaultDaysOff(workScale?: string | null) {
    if (workScale === '5X2') return [0, 6];
    if (workScale === '6X1') return [0];
    return [];
  }

  private isCycleRestDay(date: Date, dto: BulkManualTimeTrackDto, workScale?: string | null) {
    const cycle = this.resolveCycle(dto, workScale);
    if (!cycle) return false;
    const start = this.toDateOnly(this.parseDate(dto.cycleStartDate ?? '', 'Invalid cycle start date'));
    if (date < start) return false;
    const elapsedDays = Math.floor((date.getTime() - start.getTime()) / 86400000);
    const position = elapsedDays % (cycle.workDays + cycle.offDays);
    return position >= cycle.workDays;
  }

  private resolveCycle(dto: BulkManualTimeTrackDto, workScale?: string | null) {
    if (dto.cycleWorkDays && dto.cycleOffDays) return { workDays: dto.cycleWorkDays, offDays: dto.cycleOffDays };
    if (workScale === '6X1') return { workDays: 6, offDays: 1 };
    if (workScale === '5X2') return { workDays: 5, offDays: 2 };
    if (workScale === '12X36') return { workDays: 1, offDays: 1 };
    if (workScale === '4X2') return { workDays: 4, offDays: 2 };
    return null;
  }

  private async ensureEmployee(companyId: string, employeeId: string) {
    const employee = await this.repository.findEmployee(companyId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  private async ensureCanAccessEmployee(companyId: string, actor: JwtUser, employeeId: string) {
    const employee = await this.ensureEmployee(companyId, employeeId);
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV') return employee;
    if (employee.userId === actor.sub) return employee;
    throw new NotFoundException('Employee not found');
  }

  private typeToField(type: RegisterTimeDto['type']) {
    const map = { ENTRY: 'entry', LUNCH_START: 'lunchStart', LUNCH_RETURN: 'lunchReturn', EXIT: 'exit' } as const;
    return map[type];
  }

  private calculateTotals(track: { entry?: Date | null; lunchStart?: Date | null; lunchReturn?: Date | null; exit?: Date | null }) {
    if (!track.entry || !track.exit) return { totalWorked: null, dailyBalance: null };
    const gross = this.diffMinutes(track.entry, track.exit);
    const lunch = track.lunchStart && track.lunchReturn ? this.diffMinutes(track.lunchStart, track.lunchReturn) : 0;
    const totalWorked = Math.max(gross - lunch, 0);
    return { totalWorked, dailyBalance: totalWorked - STANDARD_WORKDAY_MINUTES };
  }

  private diffMinutes(start: Date, end: Date) {
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }

  private parseDate(value: string, message: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(message);
    return date;
  }

  private parseOptionalDate(value?: string | null) {
    if (value === null || value === undefined || value === '') return null;
    return this.parseDate(value, 'Invalid timestamp');
  }

  private buildObservation(reason: string, detail?: string) {
    const label = REASON_LABEL[reason] ?? reason;
    const cleanDetail = detail?.trim();
    return cleanDetail ? `${label} - ${cleanDetail}` : label;
  }

  private toDateOnly(date: Date) {
    const [day] = date.toISOString().split('T');
    return new Date(`${day}T00:00:00.000Z`);
  }

  private resolveMonth(month?: string) {
    const reference = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date();
    if (Number.isNaN(reference.getTime())) throw new BadRequestException('Invalid month');
    const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
    const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));
    return { start, end };
  }
}
