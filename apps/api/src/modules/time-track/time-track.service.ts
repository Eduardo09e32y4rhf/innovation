import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RegisterTimeDto } from './dto/register-time.dto';
import { UpdateTimeTrackDto } from './dto/update-time-track.dto';
import { TimeTrackRepository } from './time-track.repository';

const STANDARD_WORKDAY_MINUTES = 8 * 60;

@Injectable()
export class TimeTrackService {
  constructor(private readonly repository: TimeTrackRepository) {}

  list(companyId: string) {
    return this.repository.list(companyId);
  }

  async listEmployeeMonth(companyId: string, employeeId: string, month?: string) {
    await this.ensureEmployee(companyId, employeeId);
    const { start, end } = this.resolveMonth(month);
    return this.repository.listEmployeeMonth(companyId, employeeId, start, end);
  }

  async register(companyId: string, dto: RegisterTimeDto) {
    await this.ensureEmployee(companyId, dto.employeeId);
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
      entry: dto.entry ? new Date(dto.entry) : undefined,
      lunchStart: dto.lunchStart ? new Date(dto.lunchStart) : undefined,
      lunchReturn: dto.lunchReturn ? new Date(dto.lunchReturn) : undefined,
      exit: dto.exit ? new Date(dto.exit) : undefined,
      observation: dto.observation,
    };
    const next = { ...current, ...data };
    const result = await this.repository.update(companyId, id, { ...data, ...this.calculateTotals(next) });
    if (!result.count) throw new NotFoundException('Time track not found');
    return this.repository.findById(companyId, id);
  }

  private async ensureEmployee(companyId: string, employeeId: string) {
    const employee = await this.repository.findEmployee(companyId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  private typeToField(type: RegisterTimeDto['type']) {
    const map = {
      ENTRY: 'entry',
      LUNCH_START: 'lunchStart',
      LUNCH_RETURN: 'lunchReturn',
      EXIT: 'exit',
    } as const;
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
