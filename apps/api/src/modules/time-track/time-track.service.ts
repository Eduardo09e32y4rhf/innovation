import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { ManualTimeTrackDto } from './dto/manual-time-track.dto';
import { RegisterTimeDto } from './dto/register-time.dto';
import { UpdateTimeTrackDto } from './dto/update-time-track.dto';
import { TimeTrackRepository } from './time-track.repository';
import { RedisService } from '../../common/redis/redis.service';
import { WorkScheduleRulesService } from './work-schedule-rules.service';
import { TimeCalculationRulesService } from './time-calculation-rules';
import { PrismaService } from '../../database/prisma.service';

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

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
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
    private readonly timeCalcRules: TimeCalculationRulesService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly PUNCH_LOCK_TTL = 8;

  private async getStreetName(latitude: number, longitude: number): Promise<string | null> {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
        headers: {
          'User-Agent': 'InnovationRHConnect/1.0'
        }
      });
      if (res.ok) {
        const data = await res.json() as any;
        const addr = data.address;
        if (addr) {
           const road = addr.road || addr.pedestrian || addr.street || '';
           const suburb = addr.suburb || addr.neighbourhood || addr.city_district || '';
           const city = addr.city || addr.town || addr.village || '';
           const postcode = addr.postcode || '';
           const parts = [road, suburb, city, postcode].filter(Boolean);
           if (parts.length > 0) return parts.join(' - ');
        }
        return data.display_name || null;
      }
    } catch (e) {
      console.error('Nominatim Geocoding error', e);
    }
    return null;
  }
  private readonly logger = new Logger(TimeTrackService.name);

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

    // Validação de Interjornada da CLT (11h mínimas)
    if (dto.entry) {
       const previousDate = new Date(date);
       previousDate.setDate(previousDate.getDate() - 1);
       const previousTrack = await this.repository.findByEmployeeDate(employee.id, previousDate);
       
       if (previousTrack && previousTrack.exit) {
          const entryTime = new Date(`${dto.date}T${dto.entry}:00.000Z`);
          const tzOffset = entryTime.getTimezoneOffset() * 60000;
          const localEntryTime = new Date(entryTime.getTime() + tzOffset);
          
          const exitTime = previousTrack.exit;
          const diffHours = (localEntryTime.getTime() - exitTime.getTime()) / (1000 * 60 * 60);
          
          if (diffHours > 0 && diffHours < 11) {
             const isFullDayAdjustment = dto.reason?.toLowerCase().includes('atestado') || dto.reason?.toLowerCase().includes('licença') || dto.reason?.toLowerCase().includes('abono');
             if (!isFullDayAdjustment) {
                 throw new BadRequestException(`Erro de Interjornada: O descanso foi de apenas ${diffHours.toFixed(1)}h. A CLT exige 11h minimas.`);
             }
          }
       }
    }
    const isFutureAllowed = dto.reason === 'ajuste_atestado_integral' || dto.reason === 'ajuste_feriado' || dto.reason === 'ajuste_suspensao' || dto.reason === 'ajuste_folga_dsr' || dto.reason === 'ajuste_abono_folga' || dto.reason === 'ajuste_abono_banco_saida_antecipada' || dto.reason === 'ajuste_abono_atraso' || dto.reason === 'ajuste_abono_atestado_horas';
    this.validateManualTimestamp(employee, dto.entry, dto.lunchStart, dto.lunchReturn, dto.exit, date, isFutureAllowed);
    return this.applyManual(companyId, employee, dto.date, dto);
  }

  
  async logFacialAttempt(data: { companyId: string, employeeId: string, matched: boolean, similarity?: number, livenessOk?: boolean }) {
    return this.prisma.faceClockAttempt.create({
      data: {
        companyId: data.companyId,
        employeeId: data.employeeId,
        matched: data.matched,
        similarity: data.similarity,
        livenessOk: data.livenessOk,
      }
    });
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

    let targetDate: Date;
    let timestampToRecord: Date;

    if (!isManual) {
      if (dto.timestamp) throw new ForbiddenException('Ponto regular nao permite alterar data/hora. Use ajuste manual para correcoes.');
      const now = new Date();
      targetDate = this.toDateOnly(now);
      timestampToRecord = now;
      this.validateEmployeeDateRange(employee, targetDate);
    } else {
      timestampToRecord = new Date(dto.timestamp!);
      if (Number.isNaN(timestampToRecord.getTime())) throw new BadRequestException('Invalid timestamp');
      targetDate = this.toDateOnly(timestampToRecord);
      this.validateEmployeeDateRange(employee, targetDate);
      const targetDateStr = targetDate.toISOString().slice(0, 10);
      const isFutureAllowed = dto.manualReason === 'ajuste_atestado_integral' || dto.manualReason === 'ajuste_feriado' || dto.manualReason === 'ajuste_suspensao' || dto.manualReason === 'ajuste_folga_dsr' || dto.manualReason === 'ajuste_abono_folga' || dto.manualReason === 'ajuste_abono_banco_saida_antecipada' || dto.manualReason === 'ajuste_abono_atraso' || dto.manualReason === 'ajuste_abono_atestado_horas';
      this.validateManualTimestamp(employee, undefined, undefined, undefined, undefined, targetDate, isFutureAllowed);
    }

    const dateStr = targetDate.toISOString().slice(0, 10);
    const lockKey = `punch-lock:${employee.id}:${dateStr}`;
    const acquired = await this.redis.acquireLock(lockKey, this.PUNCH_LOCK_TTL);
    if (!acquired) throw new BadRequestException('Batida de ponto ja esta sendo processada. Tente novamente em instantes.');

    try {
      let type: any = dto.type;
      if (!isManual) {
        type = await this.resolveNextPunchType(employee.id, targetDate);
        if (!type) throw new BadRequestException('Todas as marcacoes de hoje ja foram registradas.');
      } else {
        if (!type) throw new BadRequestException('Informe qual marcacao sera ajustada.');
      }
      const field = this.typeToField(type!);

      const currentTrack = await this.repository.findByEmployeeDate(employee.id, targetDate);

      const rule = employee.workScheduleRuleId ? await this.prisma.workScheduleRule.findUnique({
        where: { id: employee.workScheduleRuleId }
      }) : null;

      const holiday = await this.prisma.holiday.findFirst({
        where: {
          companyId,
          date: targetDate,
        },
      });

      const calculation = this.timeCalcRules.calculateTotals(
        {
          entryTime: field === 'entry' ? timestampToRecord : currentTrack?.entry,
          lunchStartTime: field === 'lunchStart' ? timestampToRecord : currentTrack?.lunchStart,
          lunchReturnTime: field === 'lunchReturn' ? timestampToRecord : currentTrack?.lunchReturn,
          exitTime: field === 'exit' ? timestampToRecord : currentTrack?.exit,
          workDate: targetDate,
          manualReason: dto.manualReason,
        },
        employee,
        rule,
        holiday,
      );

      const overtimeHandling = 'PAYMENT';

      const updateData: any = {
        companyId,
        [field]: timestampToRecord,
        totalWorked: calculation.totalWorkedMinutes,
        dailyBalance: calculation.dailyBalanceMinutes,
        overtime50Minutes: calculation.overtime50Minutes,
        overtime100Minutes: calculation.overtime100Minutes,
        nightShiftMinutes: calculation.nightShiftMinutes,
        incidentType: calculation.incidentType,
        lateMinutes: calculation.lateMinutes,
          clockedInWithoutFacial: (dto as any).clockedInWithoutFacial || false,
        absenceMinutes: calculation.absenceMinutes,
        overtimeExceedsLimit: calculation.overtimeExceedsLimit,
        overtimeApprovalStatus: calculation.overtimeApprovalNeeded ? 'PENDING' : 'APPROVED',
        overtimeHandling,
        overtimeBankMinutes: 0,
        overtimePaymentMinutes: calculation.overtime50Minutes + calculation.overtime100Minutes,
      };

      if (!isManual) {
        updateData.observation = null;
        if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
        if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
        
        // GEOFENCING LOGIC
        let isOutOfLocation = false;
        let distanceVal = 0;

        if (!employee.allowExternalWork && dto.latitude && dto.longitude) {
          const company = await this.prisma.company.findUnique({ where: { id: companyId } });
          if (company?.latitude && company?.longitude) {
            const distance = getDistanceInMeters(dto.latitude, dto.longitude, company.latitude, company.longitude);
            const tolerance = company.radiusTolerance || 150;
            if (distance > tolerance) {
              isOutOfLocation = true;
              distanceVal = Math.round(distance);
              await this.repository.createGeofenceNotification(companyId, employee as any, dateStr, timestampToRecord.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}), distance);
            }
          }
        }

        if (isOutOfLocation) {
          updateData.manualStatus = 'pending';
          updateData.manualReason = 'Ponto fora do local permitido (' + distanceVal + 'm)';

          if (dto.latitude && dto.longitude) {
             const address = await this.getStreetName(dto.latitude, dto.longitude);
             updateData.observation = 'BATIDA FACIAL - ENDERECO: ' + (address || 'Desconhecido');
          }
        }
      } else {
        updateData.observation = dto.observation ?? `Lancamento manual - ${dto.manualReason}`;
        if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
        if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
        updateData.manualReason = dto.manualReason;
        updateData.manualStatus = 'pending';
      }

      return await this.repository.upsert(employee.id, targetDate, updateData);
    } finally {
      await this.redis.releaseLock(lockKey);
    }
  }

  async update(companyId: string, id: string, dto: UpdateTimeTrackDto) {
    const current = await this.repository.findById(companyId, id);
    if (!current) throw new NotFoundException('Time track not found');
    
    const employee = await this.prisma.employee.findUnique({ where: { id: current.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const rule = employee.workScheduleRuleId ? await this.prisma.workScheduleRule.findUnique({
      where: { id: employee.workScheduleRuleId }
    }) : null;

    const holiday = await this.prisma.holiday.findFirst({
      where: {
        companyId,
        date: current.date,
      },
    });

    const nextEntry = dto.entry !== undefined ? this.parseOptionalDate(dto.entry) : current.entry;
    const nextLunchStart = dto.lunchStart !== undefined ? this.parseOptionalDate(dto.lunchStart) : current.lunchStart;
    const nextLunchReturn = dto.lunchReturn !== undefined ? this.parseOptionalDate(dto.lunchReturn) : current.lunchReturn;
    const nextExit = dto.exit !== undefined ? this.parseOptionalDate(dto.exit) : current.exit;
    const nextObservation = dto.observation !== undefined ? (dto.observation?.trim() || null) : current.observation;

    const calculation = this.timeCalcRules.calculateTotals(
      {
        entryTime: nextEntry,
        lunchStartTime: nextLunchStart,
        lunchReturnTime: nextLunchReturn,
        exitTime: nextExit,
        workDate: current.date,
        manualReason: current.manualReason,
      },
      employee,
      rule,
      holiday,
    );

    const updateData = {
      entry: nextEntry,
      lunchStart: nextLunchStart,
      lunchReturn: nextLunchReturn,
      exit: nextExit,
      observation: nextObservation,
      totalWorked: calculation.totalWorkedMinutes,
      dailyBalance: calculation.dailyBalanceMinutes,
      overtime50Minutes: calculation.overtime50Minutes,
      overtime100Minutes: calculation.overtime100Minutes,
      nightShiftMinutes: calculation.nightShiftMinutes,
      incidentType: calculation.incidentType,
      lateMinutes: calculation.lateMinutes,
      absenceMinutes: calculation.absenceMinutes,
      overtimeExceedsLimit: calculation.overtimeExceedsLimit,
      overtimeApprovalStatus: calculation.overtimeApprovalNeeded ? 'PENDING' : 'APPROVED',
      overtimeHandling: current.overtimeHandling,
      overtimeBankMinutes: current.overtimeHandling === 'BANK' ? (calculation.overtime50Minutes + calculation.overtime100Minutes) : (current.overtimeHandling === 'SPLIT' ? Math.floor((calculation.overtime50Minutes + calculation.overtime100Minutes) / 2) : 0),
      overtimePaymentMinutes: current.overtimeHandling === 'PAYMENT' ? (calculation.overtime50Minutes + calculation.overtime100Minutes) : (current.overtimeHandling === 'SPLIT' ? Math.ceil((calculation.overtime50Minutes + calculation.overtime100Minutes) / 2) : 0),
    };

    const result = await this.repository.update(companyId, id, updateData);
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

  async approveOvertime(
    companyId: string,
    actor: JwtUser,
    id: string,
    approve: boolean,
    handling?: 'BANK' | 'PAYMENT' | 'SPLIT',
  ) {
    if (!['ADMIN', 'RH', 'GESTOR', 'DEV'].includes(actor.role)) {
      throw new ForbiddenException('Only managers can approve overtime');
    }

    const track = await this.repository.findById(companyId, id);
    if (!track) throw new NotFoundException('Time track not found');

    const totalOvertime = track.overtime50Minutes + track.overtime100Minutes;
    let bankMinutes = 0;
    let paymentMinutes = 0;

    if (handling === 'BANK') {
      bankMinutes = totalOvertime;
      paymentMinutes = 0;
    } else if (handling === 'SPLIT') {
      bankMinutes = Math.floor(totalOvertime / 2);
      paymentMinutes = totalOvertime - bankMinutes;
    } else {
      bankMinutes = 0;
      paymentMinutes = totalOvertime;
    }

    const updated = await this.repository.update(companyId, id, {
      overtimeApprovalStatus: approve ? 'APPROVED' : 'REJECTED',
      overtimeApprovedAt: new Date(),
      overtimeApprovedByUserId: actor.sub,
      overtimeHandling: handling ?? 'PAYMENT',
      overtimeBankMinutes: bankMinutes,
      overtimePaymentMinutes: paymentMinutes,
    });

    if (approve && bankMinutes > 0) {
      await this.updateOvertimeBank(companyId, track.employeeId, bankMinutes);
    }

    return updated;
  }

  private async updateOvertimeBank(companyId: string, employeeId: string, minutesToAdd: number) {
    const existing = await this.prisma.overtimeBank.findUnique({
      where: { companyId_employeeId: { companyId, employeeId } },
    });

    if (existing) {
      await this.prisma.overtimeBank.update({
        where: { id: existing.id },
        data: {
          balanceMinutes: { increment: minutesToAdd },
          accumulatedMinutes: { increment: minutesToAdd },
          lastUpdatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.overtimeBank.create({
        data: {
          companyId,
          employeeId,
          balanceMinutes: minutesToAdd,
          accumulatedMinutes: minutesToAdd,
        },
      });
    }
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
    isFutureAllowed: boolean = false,
  ) {
    const now = new Date();
    const today = this.toDateOnly(now);
    if (date) {
      this.validateEmployeeDateRange(employee, date);
      if (date > today && !isFutureAllowed) throw new BadRequestException('Ajuste manual nao permite lancamento em datas futuras.');
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

  private async applyManual(companyId: string, employee: { id: string; dailyWorkload?: string | null; workScheduleRuleId?: string | null; }, dateValue: string, dto: Pick<ManualTimeTrackDto, 'entry' | 'lunchStart' | 'lunchReturn' | 'exit' | 'reason' | 'observation'>) {
    const date = this.toDateOnly(this.parseDate(dateValue, 'Invalid date'));
    const isFullDayAdjustment = dto.reason === 'ajuste_atestado_integral' || dto.reason === 'ajuste_feriado' || dto.reason === 'ajuste_suspensao';
    const isBanco = dto.reason === 'ajuste_folga_dsr' || dto.reason === 'ajuste_abono_folga' || dto.reason === 'ajuste_abono_banco_saida_antecipada' || dto.reason === 'ajuste_abono_atraso';
    
    const entry = isFullDayAdjustment ? null : this.parseOptionalDate((dto as any).entry);
    const lunchStart = isFullDayAdjustment ? null : this.parseOptionalDate((dto as any).lunchStart);
    const lunchReturn = isFullDayAdjustment ? null : this.parseOptionalDate((dto as any).lunchReturn);
    const exit = isFullDayAdjustment ? null : this.parseOptionalDate((dto as any).exit);

    const rule = employee.workScheduleRuleId ? await this.prisma.workScheduleRule.findUnique({
      where: { id: employee.workScheduleRuleId }
    }) : null;

    const holiday = await this.prisma.holiday.findFirst({
      where: { companyId, date },
    });

    let totalsData: any = {};
    if (isBanco) {
      const workload = this.parseWorkloadToMinutes(employee.dailyWorkload) ?? (rule?.dailyMinutes || 480);
      totalsData = { totalWorked: -workload, dailyBalance: -workload };
    } else {
      const calculation = this.timeCalcRules.calculateTotals(
        { entryTime: entry, lunchStartTime: lunchStart, lunchReturnTime: lunchReturn, exitTime: exit, workDate: date, manualReason: dto.reason },
        employee,
        rule,
        holiday,
      );
      totalsData = {
        totalWorked: calculation.totalWorkedMinutes,
        dailyBalance: calculation.dailyBalanceMinutes,
        overtime50Minutes: calculation.overtime50Minutes,
        overtime100Minutes: calculation.overtime100Minutes,
        nightShiftMinutes: calculation.nightShiftMinutes,
        incidentType: calculation.incidentType,
        lateMinutes: calculation.lateMinutes,
        absenceMinutes: calculation.absenceMinutes,
        overtimeExceedsLimit: calculation.overtimeExceedsLimit,
        overtimeApprovalStatus: calculation.overtimeApprovalNeeded ? 'PENDING' : 'APPROVED',
        overtimeHandling: 'PAYMENT',
        overtimeBankMinutes: 0,
        overtimePaymentMinutes: calculation.overtime50Minutes + calculation.overtime100Minutes,
      };
    }

    const data = {
      companyId,
      entry,
      lunchStart,
      lunchReturn,
      exit,
      observation: this.buildObservation(dto.reason, dto.observation),
      manualReason: dto.reason,
      manualStatus: 'pending',
      ...totalsData
    };

    return this.repository.upsert(employee.id, date, data);
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

  private canAccessEmployee(actor: JwtUser, employee?: { user?: { role?: string } | null } | null) {
    if (!employee) return false;
    if (actor.role === 'DEV') return true;
    return String(employee.user?.role || '').toUpperCase() !== 'DEV';
  }

  private filterRestrictedTracks<T extends { employee?: { user?: { role?: string } | null } | null }>(tracks: T[], actor: JwtUser) {
    if (actor.role === 'DEV') return tracks;
    return tracks.filter((track) => this.canAccessEmployee(actor, track.employee));
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
    const tzDateStr = date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return new Date(`${tzDateStr}T00:00:00.000Z`);
  }

  private parseWorkloadToMinutes(workload?: string | null): number | null {
    if (!workload) return null;
    const match = workload.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
}
