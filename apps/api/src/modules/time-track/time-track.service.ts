import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { ManualTimeTrackDto } from './dto/manual-time-track.dto';
import { RegisterTimeDto } from './dto/register-time.dto';
import { UpdateTimeTrackDto } from './dto/update-time-track.dto';
import { TimeTrackRepository } from './time-track.repository';
import { RedisService } from '../../common/redis/redis.service';
import { WorkScheduleRulesService } from './work-schedule-rules.service';

const DEFAULT_WORKDAY_MINUTES = 8 * 60;
const TOLERANCE_MINUTES = 5;

function parseWorkloadToMinutes(workload?: string | null): number {
  if (!workload) return DEFAULT_WORKDAY_MINUTES;
  const match = workload.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return DEFAULT_WORKDAY_MINUTES;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function timeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const REASON_LABEL: Record<string, string> = {
  ajuste_erro_marcacao: 'AJUSTE - ERRO MARCAÇÃO',
  ajuste_atestado_integral: 'ATESTADO INTEGRAL',
  ajuste_feriado: 'FERIADO',
  ajuste_abono_atestado_horas: 'ABONO - ATESTADO DE HORAS',
  ajuste_folga_dsr: 'FOLGA',
  ajuste_abono_folga: 'ABONO - FOLGA (BANCO)',
  ajuste_abono_banco_saida_antecipada: 'ABONO - BANCO SAÍDA ANTECIPADA',
  ajuste_abono_atraso: 'ABONO - ATRASO',
  ajuste_suspensao: 'SUSPENSÃO',
};

@Injectable()
export class TimeTrackService {
  constructor(
    private readonly repository: TimeTrackRepository,
    private readonly redis: RedisService,
    private readonly rulesService: WorkScheduleRulesService,
  ) {}

  private readonly PUNCH_LOCK_TTL = 8;

  private async resolveRule(companyId: string) {
    try {
      return await this.rulesService.findActive(companyId);
    } catch {
      return null;
    }
  }

  async list(companyId: string, actor: JwtUser, month?: string) {
    const { start, end } = this.resolveMonth(month);
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV' || actor.role === 'CONSULTA') {
      const tracks = await this.repository.list(companyId, start, end);
      return this.filterRestrictedTracks(tracks, actor);
    }
    if (actor.role === 'GESTOR') {
      const tracks = await this.repository.listForManager(companyId, actor.sub, actor.email, start, end);
      return this.filterRestrictedTracks(tracks, actor);
    }
    const employee = await this.repository.findEmployeeByUserId(companyId, actor.sub, actor.email);
    if (!employee || !this.canAccessEmployee(actor, employee)) return [];
    return this.repository.listForEmployee(companyId, employee.id, start, end);
  }

  async listEmployeeMonth(companyId: string, actor: JwtUser, employeeId: string, month?: string) {
    await this.ensureCanAccessEmployee(companyId, actor, employeeId);
    const { start, end } = this.resolveMonth(month);
    return this.repository.listEmployeeMonth(companyId, employeeId, start, end);
  }

  async manual(companyId: string, actor: JwtUser, dto: ManualTimeTrackDto) {
    const employee = await this.ensureCanAccessEmployee(companyId, actor, dto.employeeId);
    const date = this.toDateOnly(this.parseDate(dto.date, 'Invalid date'));
    this.validateEmployeeDateRange(employee, date);
    if (dto.reason.includes('abono')) {
      const suggestion = this.suggestAbsenceMinutes(employee, date);
      if (suggestion !== null && suggestion > 0) {
        const currentEntry = dto.entry;
        if (!currentEntry || timeToMinutes(currentEntry) === null) {
          const suggestedEntry = this.suggestEntryTime(employee, date, suggestion);
          Object.assign(dto, { entry: suggestedEntry });
        }
      }
    }
    this.validateManualTimestamp(employee, dto.entry, dto.lunchStart, dto.lunchReturn, dto.exit, date);
    return this.applyManual(employee, dto.date, dto);
  }



  async register(companyId: string, actor: JwtUser, dto: RegisterTimeDto) {
    if (actor.role === 'DEV' || actor.role === 'COMERCIAL' || actor.role === 'CONSULTA') {
      throw new ForbiddenException('Este perfil nao bate ponto');
    }
    const isManual = Boolean(dto.manualReason);
    if (isManual && !dto.type) throw new BadRequestException('Informe qual marcacao manual sera ajustada.');
    const employee = isManual && dto.employeeId
      ? await this.ensureCanAccessEmployee(companyId, actor, dto.employeeId)
      : await this.repository.findEmployeeByUserId(companyId, actor.sub, actor.email);
    if (!employee) throw new ForbiddenException('Seu usuario ainda nao esta vinculado a um funcionario ativo. Procure o RH.');
    if (employee.userId && employee.userId !== actor.sub) throw new ForbiddenException('Este funcionario ja esta vinculado a outro usuario. Procure o RH.');
    if (!employee.userId) await this.repository.updateEmployeeUserLink(companyId, employee.id, actor.sub);
    if (employee.status !== 'ACTIVE') throw new ForbiddenException('Funcionario desligado ou inativo nao pode bater ponto.');

    if (!isManual) {
      if (dto.timestamp) throw new ForbiddenException('Ponto regular nao permite alterar data/hora. Use ajuste manual para correcoes.');
      const now = new Date();
      const today = this.toDateOnly(now);
      this.validateEmployeeDateRange(employee, today);
      const dateStr = today.toISOString().slice(0, 10);
      const lockKey = `punch-lock:${employee.id}:${dateStr}`;
      const acquired = await this.redis.acquireLock(lockKey, this.PUNCH_LOCK_TTL);
      if (!acquired) throw new BadRequestException('Batida de ponto ja esta sendo processada. Tente novamente em instantes.');
      try {
        const type = await this.resolveNextPunchType(employee.id, today);
        if (!type) throw new BadRequestException('Todas as marcacoes de hoje ja foram registradas.');
        const field = this.typeToField(type);
        const current = await this.repository.upsert(employee.id, today, {
          [field]: now,
          observation: null,
          ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
          ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        });
        const totals = this.calculateTotals({ ...current, [field]: now }, employee, today);
        const incidents = this.detectIncidents(employee, today, { ...current, ...totals });
        if (incidents) {
          await this.repository.update(companyId, current.id, {
            observation: incidents.observation,
            incidentType: incidents.type,
            toleranceMinutes: incidents.tolerance,
            absenceMinutes: incidents.absence,
          });
        }
        
        // GEOFENCING LOGIC
        if (!employee.allowExternalWork && dto.latitude && dto.longitude) {
          const company = await this.repository.getCompanyData(companyId);
          if (company?.latitude && company?.longitude) {
            const distance = getDistanceInMeters(dto.latitude, dto.longitude, company.latitude, company.longitude);
            if (distance > 300) { // 300 meters tolerance
              await this.repository.createGeofenceNotification(companyId, employee, dateStr, now.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}), distance);
            }
          }
        }
        
        return this.repository.upsert(employee.id, today, totals);
      } finally {
        await this.redis.releaseLock(lockKey);
      }
    }

    const timestamp = new Date(dto.timestamp!);
    if (Number.isNaN(timestamp.getTime())) throw new BadRequestException('Invalid timestamp');
    const date = this.toDateOnly(timestamp);
    const dateStr = date.toISOString().slice(0, 10);
    this.validateEmployeeDateRange(employee, date);
    this.validateManualTimestamp(employee, undefined, undefined, undefined, undefined, date);
    const lockKey = `punch-lock:${employee.id}:${dateStr}`;
    const acquired = await this.redis.acquireLock(lockKey, this.PUNCH_LOCK_TTL);
    if (!acquired) throw new BadRequestException('Batida de ponto ja esta sendo processada. Tente novamente em instantes.');
    try {
      const type = dto.type;
      if (!type) throw new BadRequestException('Informe qual marcacao sera ajustada.');
      const field = this.typeToField(type);
      const current = await this.repository.upsert(employee.id, date, {
        [field]: timestamp,
        observation: dto.observation ?? `Lancamento manual - ${dto.manualReason}`,
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        manualReason: dto.manualReason,
        manualStatus: 'pending',
      });
      const totals = this.calculateTotals({ ...current, [field]: timestamp }, employee, date);
      const incidents = this.detectIncidents(employee, date, { ...current, [field]: timestamp, ...totals });
      if (incidents && dto.manualReason !== 'ajuste_suspensao') {
        await this.repository.update(companyId, current.id, {
          incidentType: incidents.type,
          toleranceMinutes: incidents.tolerance,
          absenceMinutes: incidents.absence,
        });
      }
      return this.repository.upsert(employee.id, date, totals);
    } finally {
      await this.redis.releaseLock(lockKey);
    }
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
    const employee = await this.repository.findEmployee(companyId, current.employeeId);
    const result = await this.repository.update(companyId, id, { ...data, ...this.calculateTotals(next, employee ?? undefined, next.date) });
    if (!result.count) throw new NotFoundException('Time track not found');
    return this.repository.findById(companyId, id);
  }

  async listPending(companyId: string, actor: JwtUser) {
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV') {
      const tracks = await this.repository.listPending(companyId);
      return this.filterRestrictedTracks(tracks, actor);
    }
    if (actor.role === 'GESTOR') {
      const tracks = await this.repository.listPendingForManager(companyId, actor.sub, actor.email);
      return this.filterRestrictedTracks(tracks, actor);
    }
    return [];
  }

  async approveManual(companyId: string, actor: JwtUser, id: string, approved: boolean) {
    const track = await this.repository.findById(companyId, id);
    if (!track) throw new NotFoundException('Time track not found');
    if (track.manualStatus !== 'pending') throw new BadRequestException('Este ponto nao esta pendente de aprovacao');
    if (actor.role === 'GESTOR') {
      const managerEmployee = await this.repository.findEmployeeByUserId(companyId, actor.sub, actor.email);
      if (!managerEmployee) throw new ForbiddenException('Permissao insuficiente');
      const employee = await this.repository.findEmployee(companyId, track.employeeId);
      if (!employee || employee.managerId !== managerEmployee.id) throw new ForbiddenException('Permissao insuficiente');
    }
    const status = approved ? 'approved' : 'rejected';
    return this.repository.updateManualStatus(companyId, id, status);
  }

  async revokeManual(companyId: string, actor: JwtUser, id: string, reason: string) {
    if (actor.role !== 'ADMIN' && actor.role !== 'RH' && actor.role !== 'DEV') {
      throw new ForbiddenException('Apenas RH pode revogar um ajuste de ponto.');
    }
    const track = await this.repository.findById(companyId, id);
    if (!track) throw new NotFoundException('Time track not found');
    if (track.manualStatus !== 'approved') throw new BadRequestException('Apenas ajustes aprovados podem ser revogados.');
    return this.repository.updateManualStatus(companyId, id, 'revoked', reason);
  }

  async delete(companyId: string, id: string) {
    const result = await this.repository.delete(companyId, id);
    if (!result.count) throw new NotFoundException('Time track not found');
    return { deleted: true };
  }

  // ─── REGRAS DE OCORRÊNCIA E ABONO ────────────────────────────────────

  private suggestAbsenceMinutes(employee: { standardEntry?: string | null; standardExit?: string | null; dailyWorkload?: string | null }, date: Date): number | null {
    const workload = parseWorkloadToMinutes(employee.dailyWorkload);
    const entryMins = timeToMinutes(employee.standardEntry);
    const exitMins = timeToMinutes(employee.standardExit);
    if (entryMins === null || exitMins === null) return null;
    const expectedExit = entryMins + workload;
    if (expectedExit > exitMins) return null;
    const absentMinutes = exitMins - expectedExit;
    return Math.max(absentMinutes, 0);
  }

  private suggestEntryTime(employee: { standardEntry?: string | null; dailyWorkload?: string | null }, date: Date, absenceMinutes: number): string {
    const workload = parseWorkloadToMinutes(employee.dailyWorkload);
    const entryMins = timeToMinutes(employee.standardEntry);
    if (entryMins === null) return '00:00';
    const startMins = entryMins;
    const endMins = startMins + workload - absenceMinutes;
    const hh = Math.floor(endMins / 60);
    const mm = endMins % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  private detectIncidents(
    employee: { standardEntry?: string | null; standardLunchStart?: string | null; standardLunchReturn?: string | null; standardExit?: string | null },
    date: Date,
    track: { entry?: Date | null; lunchStart?: Date | null; lunchReturn?: Date | null; exit?: Date | null; totalWorked?: number | null }
  ): { type: 'atraso' | 'saida_antecipada' | 'falta'; tolerance: number; absence: number; observation: string } | null {
    const entryMins = track.entry ? timeToMinutes(track.entry.toISOString().slice(11, 16)) : null;
    const exitMins = track.exit ? timeToMinutes(track.exit.toISOString().slice(11, 16)) : null;
    const expectedEntry = timeToMinutes(employee.standardEntry);
    const expectedExit = timeToMinutes(employee.standardExit);

    if (entryMins === null || exitMins === null) {
      if (!track.entry && !track.exit) return { type: 'falta', tolerance: 0, absence: 0, observation: 'FALTA' };
      return null;
    }
    let incidentType: 'atraso' | 'saida_antecipada' | 'falta' | null = null;
    let tolerance = 0;
    let absence = 0;
    if (expectedEntry !== null && entryMins > expectedEntry) {
      const diff = entryMins - expectedEntry;
      if (diff > TOLERANCE_MINUTES) { incidentType = 'atraso'; tolerance = diff; }
    }
    if (expectedExit !== null && exitMins < expectedExit) {
      const diff = expectedExit - exitMins;
      if (diff > TOLERANCE_MINUTES) { incidentType = 'saida_antecipada'; absence = diff; }
    }
    if (!incidentType) return null;
    const observation = incidentType === 'atraso' ? `ATRASO ${tolerance}min` : `SAIDA ANTECIPADA ${absence}min`;
    return { type: incidentType, tolerance, absence, observation };
  }

  // ─── VALIDAÇÕES TEMPORAIS ───────────────────────────────────────────────

  private validateEmployeeDateRange(employee: { admissionDate: Date | string; terminationDate?: Date | string | null }, requestedDate: Date) {
    const admission = new Date(employee.admissionDate);
    const admissionDate = this.toDateOnly(admission);
    if (requestedDate < admissionDate) throw new BadRequestException(`Nao e permitido lancar ponto anterior a data de admissao (${this.formatDateOnly(admissionDate)}).`);
    if (employee.terminationDate) {
      const termination = new Date(employee.terminationDate);
      const terminationDate = this.toDateOnly(termination);
      if (requestedDate > terminationDate) throw new BadRequestException(`Nao e permitido lancar ponto posterior a data de demissao (${this.formatDateOnly(terminationDate)}).`);
    }
  }

  private validateManualTimestamp(
    employee: { admissionDate: Date | string; terminationDate?: Date | string | null },
    entry?: string | null,
    lunchStart?: string | null,
    lunchReturn?: string | null,
    exit?: string | null,
    date?: Date,
  ) {
    const now = new Date();
    const today = this.toDateOnly(now);
    if (date) {
      this.validateEmployeeDateRange(employee, date);
      if (date > today) throw new BadRequestException('Ajuste manual nao permite lancamento em datas futuras.');
    }
    const timeFields = [
      { label: 'Entrada', value: entry },
      { label: 'Saída almoço', value: lunchStart },
      { label: 'Retorno almoço', value: lunchReturn },
      { label: 'Saída', value: exit },
    ];
    for (const field of timeFields) {
      if (!field.value) continue;
      const [hours, minutes] = field.value.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) continue;
      const fieldDate = new Date(now);
      fieldDate.setHours(hours, minutes, 0, 0);
      if (date && this.toDateOnly(date).getTime() === today.getTime() && fieldDate > now) {
        throw new BadRequestException(`Ajuste manual nao permite lancamento de horario futuro para "${field.label}". Agora sao ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`);
      }
    }
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private async applyManual(employee: { id: string; dailyWorkload?: string | null }, dateValue: string, dto: Pick<ManualTimeTrackDto, 'entry' | 'lunchStart' | 'lunchReturn' | 'exit' | 'reason' | 'observation'>) {
    const date = this.toDateOnly(this.parseDate(dateValue, 'Invalid date'));
    const isFullDayAdjustment = dto.reason === 'ajuste_atestado_integral' || dto.reason === 'ajuste_feriado' || dto.reason === 'ajuste_suspensao';
    const isBanco = dto.reason === 'ajuste_folga_dsr' || dto.reason === 'ajuste_abono_folga' || dto.reason === 'ajuste_abono_banco_saida_antecipada' || dto.reason === 'ajuste_abono_atraso';
    const data = {
      entry: isFullDayAdjustment ? null : this.parseOptionalDate((dto as any).entry),
      lunchStart: isFullDayAdjustment ? null : this.parseOptionalDate((dto as any).lunchStart),
      lunchReturn: isFullDayAdjustment ? null : this.parseOptionalDate((dto as any).lunchReturn),
      exit: isFullDayAdjustment ? null : this.parseOptionalDate((dto as any).exit),
      observation: this.buildObservation(dto.reason, dto.observation),
      manualReason: dto.reason,
      manualStatus: 'pending',
    };
    if (isBanco) {
      const workload = parseWorkloadToMinutes(employee.dailyWorkload);
      return this.repository.upsert(employee.id, date, { ...data, totalWorked: -workload, dailyBalance: -workload });
    }
    const totals = this.calculateTotals(data, employee, date);
    return this.repository.upsert(employee.id, date, { ...data, ...totals });
  }



  private async ensureEmployee(companyId: string, employeeId: string) {
    const employee = await this.repository.findEmployee(companyId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  private async ensureCanAccessEmployee(companyId: string, actor: JwtUser, employeeId: string) {
    const employee = await this.ensureEmployee(companyId, employeeId);
    if (!this.canAccessEmployee(actor, employee)) throw new NotFoundException('Employee not found');
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV' || actor.role === 'CONSULTA') return employee;
    const sameEmail = Boolean(employee.email && actor.email && employee.email.toLowerCase() === actor.email.toLowerCase());
    if (employee.userId === actor.sub || sameEmail) return employee;
    throw new NotFoundException('Employee not found');
  }

  private async resolveNextPunchType(employeeId: string, date: Date): Promise<NonNullable<RegisterTimeDto['type']> | null> {
    const current = await this.repository.findByEmployeeDate(employeeId, date);
    if (!current?.entry) return 'ENTRY';
    if (!current.lunchStart) return 'LUNCH_START';
    if (!current.lunchReturn) return 'LUNCH_RETURN';
    if (!current.exit) return 'EXIT';
    return null;
  }

  private typeToField(type: NonNullable<RegisterTimeDto['type']>) {
    const map = { ENTRY: 'entry', LUNCH_START: 'lunchStart', LUNCH_RETURN: 'lunchReturn', EXIT: 'exit' } as const;
    return map[type];
  }

  private calculateTotals(
    track: { entry?: Date | null; lunchStart?: Date | null; lunchReturn?: Date | null; exit?: Date | null; manualReason?: string | null; observation?: string | null },
    employee?: { workScale?: string | null; dailyWorkload?: string | null; standardEntry?: string | null; standardExit?: string | null },
    date?: Date
  ) {
    if (!track.entry || !track.exit) return { totalWorked: null, dailyBalance: null, overtime50Minutes: null, overtime100Minutes: null, nightShiftMinutes: null, incidentType: null };
    const gross = this.diffMinutes(track.entry, track.exit);
    const lunch = track.lunchStart && track.lunchReturn ? this.diffMinutes(track.lunchStart, track.lunchReturn) : 0;
    const totalWorked = Math.max(gross - lunch, 0);
    
    let isRest = false;
    if (date) {
      const wd = date.getUTCDay();
      const s = employee?.workScale;
      if (s === '5X2' && (wd === 0 || wd === 6)) isRest = true;
      if (s === '6X1' && wd === 0) isRest = true;
    }
    const o = (track.observation ?? '').toLowerCase();
    const r = (track.manualReason ?? '').toLowerCase();
    if (o.includes('folga') || o.includes('feriado') || r.includes('folga') || r.includes('feriado')) {
      isRest = true;
    }

    const workload = isRest ? 0 : parseWorkloadToMinutes(employee?.dailyWorkload);
    const dailyBalance = totalWorked - workload;

    let overtime50Minutes = 0;
    let overtime100Minutes = 0;
    let nightShiftMinutes = 0;
    let incidentType: string | null = null;

    if (dailyBalance > 0) {
      if (isRest) {
        overtime100Minutes = dailyBalance;
      } else {
        overtime50Minutes = dailyBalance;
      }
    } else if (dailyBalance < 0 && !isRest) {
      const getMin = (d: Date) => d.getHours() * 60 + d.getMinutes();
      const actualEntry = getMin(track.entry);
      const actualExit = getMin(track.exit);
      const stdEntry = timeToMinutes(employee?.standardEntry);
      const stdExit = timeToMinutes(employee?.standardExit);
      
      if (stdEntry !== null && actualEntry > stdEntry + TOLERANCE_MINUTES) {
        incidentType = 'atraso';
      } else if (stdExit !== null && actualExit < stdExit - TOLERANCE_MINUTES) {
        incidentType = 'saida_antecipada';
      }
    }

    const getMin = (d: Date) => d.getHours() * 60 + d.getMinutes();
    const s = getMin(track.entry);
    const e = getMin(track.exit) + (track.entry.getDate() !== track.exit.getDate() ? 24 * 60 : 0);
    
    const nightStart = 22 * 60; // 1320
    const nightEnd = 24 * 60 + 5 * 60; // 1740

    if (e > nightStart) {
      const overlapStart = Math.max(s, nightStart);
      const overlapEnd = Math.min(e, nightEnd);
      if (overlapEnd > overlapStart) nightShiftMinutes += (overlapEnd - overlapStart);
    }
    if (s < 5 * 60) {
      const overlapStart = s;
      const overlapEnd = Math.min(e, 5 * 60);
      if (overlapEnd > overlapStart) nightShiftMinutes += (overlapEnd - overlapStart);
    }

    return { totalWorked, dailyBalance, overtime50Minutes, overtime100Minutes, nightShiftMinutes, incidentType };
  }


  private canAccessEmployee(actor: JwtUser, employee?: { user?: { role?: string } | null } | null) {
    if (!employee) return false;
    if (actor.role === 'DEV') return true;
    return String(employee.user?.role || '').toUpperCase() !== 'DEV';
  }

  private filterRestrictedTracks<T extends { employee?: { user?: { role?: string } | null } | null }>(tracks: T[], actor: JwtUser) {
    if (actor.role === 'DEV') return tracks;
    return tracks.filter((track) => this.canAccessEmployee(actor, track.employee));
  }
  private diffMinutes(start: Date, end: Date) {
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }

  private resolveMonth(month?: string) {
    const reference = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date();
    if (Number.isNaN(reference.getTime())) throw new BadRequestException('Invalid month');
    const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
    const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));
    return { start, end };
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
}
