import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { ManualTimeTrackDto } from './dto/manual-time-track.dto';
import { RegisterTimeDto } from './dto/register-time.dto';
import { UpdateTimeTrackDto } from './dto/update-time-track.dto';
import { TimeTrackRepository } from './time-track.repository';

const STANDARD_WORKDAY_MINUTES = 8 * 60;
const REASON_LABEL: Record<string, string> = {
  ajuste_abono_atestado_horas: 'Ajuste - abono (atestado de horas)',
  ajuste_atestado_integral: 'Ajuste - atestado integral',
  ajuste_folga_dsr: 'Ajuste - folga DSR',
  ajuste_abono_folga: 'Ajuste abono - folga',
  ajuste_erro_marcacao: 'Ajuste erro de marcacao',
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
    const date = this.toDateOnly(this.parseDate(dto.date, 'Invalid date'));
    const isFullCertificate = dto.reason === 'ajuste_atestado_integral';
    const data = {
      entry: isFullCertificate ? null : this.parseOptionalDate(dto.entry),
      lunchStart: isFullCertificate ? null : this.parseOptionalDate(dto.lunchStart),
      lunchReturn: isFullCertificate ? null : this.parseOptionalDate(dto.lunchReturn),
      exit: isFullCertificate ? null : this.parseOptionalDate(dto.exit),
      observation: this.buildObservation(dto.reason, dto.observation),
    };
    const totals = this.calculateTotals(data);
    return this.repository.upsert(dto.employeeId, date, { ...data, ...totals });
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
