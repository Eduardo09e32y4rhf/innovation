import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import type { JwtUser } from '../../../common/types/auth.types';
import { toDateOnly } from '../../../common/utils/date.utils';
import { ScheduleScopeService } from '../../schedule/access/schedule-scope.service';
import { TimeTrackService, type RegisterContext } from '../../time-track/time-track.service';
import { DayResolver, minutesBetween } from '../calendar/day-resolver';
import { HubNotifyService } from '../notify.service';
import { PolicyService } from '../policy/policy.service';
import { PunchDto } from './punch.dto';
import { buildPunchReceiptPdf } from './punch-receipt-pdf';
import { PUNCH_TYPE_LABEL, describeDistance, evaluateFences, nextPunchType, punchReceipt, speedKmh, type FencePoint, type PunchType } from './punch-rules';

export interface PunchMeta { ipAddress?: string; userAgent?: string }

@Injectable()
export class PunchService {
  private readonly logger = new Logger(PunchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScheduleScopeService,
    private readonly policies: PolicyService,
    private readonly timeTrack: TimeTrackService,
    private readonly days: DayResolver,
    private readonly notify: HubNotifyService,
  ) {}

  private async employeeFor(actor: JwtUser) {
    this.scope.assertCapability(actor, 'punch');
    const employee = await this.prisma.employee.findFirst({ where: { companyId: actor.companyId, userId: actor.sub } });
    if (!employee) throw new ForbiddenException('Seu usuario ainda nao esta vinculado a um funcionario. Procure o RH.');
    if (employee.status !== 'ACTIVE') throw new ForbiddenException('Funcionario inativo ou desligado nao bate ponto.');
    return employee;
  }

  private async fencesFor(companyId: string, employee: { allowExternalWork?: boolean | null }): Promise<FencePoint[]> {
    if (employee.allowExternalWork) return [];
    const fences = await this.prisma.geofence.findMany({ where: { companyId, active: true } });
    if (fences.length) {
      return fences.map((fence) => ({ id: fence.id, name: fence.name, latitude: fence.latitude, longitude: fence.longitude, radiusMeters: fence.radiusMeters }));
    }
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { latitude: true, longitude: true, radiusTolerance: true, name: true } });
    if (company?.latitude != null && company?.longitude != null) {
      return [{ id: null, name: company.name ?? 'Sede', latitude: company.latitude, longitude: company.longitude, radiusMeters: company.radiusTolerance || 150 }];
    }
    return [];
  }

  private async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'InnovationRHConnect/1.0' }, signal: AbortSignal.timeout(2500) },
      );
      if (!response.ok) return null;
      const data = (await response.json()) as any;
      const a = data.address ?? {};
      const parts = [a.road || a.pedestrian || a.street, a.suburb || a.neighbourhood, a.city || a.town || a.village].filter(Boolean);
      return parts.length ? parts.join(' - ') : data.display_name ?? null;
    } catch {
      return null;
    }
  }

  /** Comprovante em PDF de uma batida. Cada funcionario so obtem os proprios comprovantes. */
  async receiptPdf(actor: JwtUser, receipt: string) {
    const employee = await this.employeeFor(actor);
    const event = await this.prisma.punchEvent.findFirst({ where: { receipt, companyId: actor.companyId, employeeId: employee.id } });
    if (!event) throw new NotFoundException('Comprovante nao encontrado.');
    const company = await this.prisma.company.findUnique({ where: { id: actor.companyId }, select: { name: true, document: true } });
    const buffer = await buildPunchReceiptPdf({
      company: { name: company?.name ?? 'Empresa', document: company?.document },
      employee: { name: employee.name, registration: employee.registration, cpf: employee.cpf, position: employee.position },
      event: {
        receipt: event.receipt,
        typeLabel: PUNCH_TYPE_LABEL[event.type as PunchType] ?? event.type,
        occurredAt: event.occurredAt,
        origin: event.origin,
        address: event.address,
        latitude: event.latitude,
        longitude: event.longitude,
        withinFence: event.withinFence,
        distanceMeters: event.distanceMeters,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      },
      issuedAt: new Date(),
    });
    return { buffer, filename: `comprovante-ponto-${event.receipt}.pdf` };
  }

  /** Estado do ponto de hoje: batidas, próxima batida esperada, escala do dia e política vigente. */
  async today(actor: JwtUser) {
    const employee = await this.employeeFor(actor);
    const workDate = toDateOnly(new Date());
    const [track, events, day, policy, fences] = await Promise.all([
      this.prisma.timeTrack.findFirst({ where: { companyId: actor.companyId, employeeId: employee.id, date: workDate } }),
      this.prisma.punchEvent.findMany({ where: { companyId: actor.companyId, employeeId: employee.id, workDate }, orderBy: { occurredAt: 'asc' } }),
      this.days.resolveDay(actor.companyId, employee.id, workDate),
      this.policies.getPolicy(actor.companyId),
      this.fencesFor(actor.companyId, employee),
    ]);
    const next = nextPunchType(track);
    return {
      employee: { id: employee.id, name: employee.name },
      workDate: workDate.toISOString().slice(0, 10),
      serverTime: new Date().toISOString(),
      day,
      next: next ? { type: next, label: PUNCH_TYPE_LABEL[next] } : null,
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        label: PUNCH_TYPE_LABEL[event.type as PunchType] ?? event.type,
        occurredAt: event.occurredAt,
        withinFence: event.withinFence,
        distanceMeters: event.distanceMeters,
        flags: event.flags,
        address: event.address,
        receipt: event.receipt,
      })),
      totals: track ? { totalWorked: track.totalWorked, dailyBalance: track.dailyBalance, lateMinutes: track.lateMinutes, overtime50Minutes: track.overtime50Minutes, overtime100Minutes: track.overtime100Minutes } : null,
      policy: { requireLocation: policy.requireLocation, fencePolicy: policy.fencePolicy, maxAccuracyMeters: policy.maxAccuracyMeters, requireJustificationOutside: policy.requireJustificationOutside },
      fenceConfigured: fences.length > 0,
      external: Boolean(employee.allowExternalWork),
    };
  }

  async punch(actor: JwtUser, dto: PunchDto, meta: PunchMeta) {
    const employee = await this.employeeFor(actor);
    const policy = await this.policies.getPolicy(actor.companyId);
    const now = new Date();
    const workDate = toDateOnly(now);

    const hasLocation = dto.latitude !== undefined && dto.longitude !== undefined;
    if (policy.requireLocation && !hasLocation) {
      throw new BadRequestException({ message: 'Ative a localizacao do aparelho para bater o ponto.', code: 'LOCATION_REQUIRED' });
    }
    if (hasLocation && dto.accuracyMeters !== undefined && dto.accuracyMeters > policy.maxAccuracyMeters) {
      throw new BadRequestException({
        message: `Precisao do GPS insuficiente (${Math.round(dto.accuracyMeters)} m; maximo ${policy.maxAccuracyMeters} m). Va para um local aberto e tente de novo.`,
        code: 'LOW_ACCURACY',
      });
    }

    const todays = await this.prisma.punchEvent.findMany({ where: { companyId: actor.companyId, employeeId: employee.id, workDate }, orderBy: { occurredAt: 'desc' } });
    if (todays.length >= policy.maxPunchesPerDay) throw new BadRequestException('Todas as marcacoes de hoje ja foram registradas.');
    const last = todays[0];
    if (last && (now.getTime() - last.occurredAt.getTime()) / 1000 < policy.minIntervalSeconds) {
      throw new BadRequestException({ message: `Aguarde ${policy.minIntervalSeconds}s entre uma batida e outra.`, code: 'TOO_FAST' });
    }

    const flags: string[] = [];
    if (hasLocation && last?.latitude != null && last.longitude != null) {
      const speed = speedKmh({ latitude: last.latitude, longitude: last.longitude, at: last.occurredAt }, { latitude: dto.latitude!, longitude: dto.longitude!, at: now });
      if (speed > policy.maxSpeedKmh) flags.push('SALTO_DE_POSICAO');
    }

    const fences = hasLocation ? await this.fencesFor(actor.companyId, employee) : [];
    const verdict = hasLocation && policy.fencePolicy !== 'OFF'
      ? evaluateFences(dto.latitude!, dto.longitude!, fences)
      : { configured: false, inside: true, distanceMeters: null, fence: null };
    const outOfFence = verdict.configured && !verdict.inside;
    const justification = dto.justification?.trim() || undefined;

    if (outOfFence) {
      if (policy.fencePolicy === 'BLOCK') {
        throw new ForbiddenException({
          message: `Voce esta a ${describeDistance(verdict.distanceMeters ?? 0)} de ${verdict.fence?.name ?? 'o local permitido'}. Bata o ponto no local de trabalho.`,
          code: 'OUT_OF_FENCE',
          distanceMeters: verdict.distanceMeters,
        });
      }
      if (policy.requireJustificationOutside && !justification) {
        throw new BadRequestException({
          message: `Voce esta a ${describeDistance(verdict.distanceMeters ?? 0)} de ${verdict.fence?.name ?? 'o local permitido'}. Informe uma justificativa para registrar o ponto fora do local.`,
          code: 'JUSTIFICATION_REQUIRED',
          distanceMeters: verdict.distanceMeters,
        });
      }
      flags.push('FORA_DA_CERCA');
    }

    const address = hasLocation ? await this.reverseGeocode(dto.latitude!, dto.longitude!) : null;
    const ctx: RegisterContext = {
      geo: { outOfFence, address, reason: outOfFence ? `Ponto fora do local permitido (${describeDistance(verdict.distanceMeters ?? 0)})${justification ? `: ${justification}` : ''}` : undefined },
    };
    const track = await this.timeTrack.register(
      actor.companyId,
      actor,
      { latitude: dto.latitude, longitude: dto.longitude, observation: justification } as any,
      ctx,
    );

    const type = (ctx.result?.type ?? 'ENTRY') as PunchType;
    const occurredAt = ctx.result?.timestamp ?? now;
    const receipt = punchReceipt({ companyId: actor.companyId, employeeId: employee.id, occurredAt, type, latitude: dto.latitude, longitude: dto.longitude, nonce: randomUUID() });
    const event = await this.prisma.punchEvent.create({
      data: {
        companyId: actor.companyId,
        employeeId: employee.id,
        timeTrackId: ctx.result?.trackId ?? (track as any)?.id ?? null,
        occurredAt,
        workDate: ctx.result?.workDate ?? workDate,
        type,
        origin: 'APP',
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        accuracyMeters: dto.accuracyMeters ?? null,
        address,
        geofenceId: verdict.fence?.id ?? null,
        withinFence: verdict.configured ? verdict.inside : null,
        distanceMeters: verdict.distanceMeters,
        flags,
        justification: justification ?? null,
        deviceId: dto.deviceId ?? null,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent?.slice(0, 300) ?? null,
        receipt,
      },
    });

    if (outOfFence) {
      const manager = employee.managerId ? await this.prisma.employee.findUnique({ where: { id: employee.managerId }, select: { userId: true } }) : null;
      await this.notify.notify(
        actor.companyId,
        [manager?.userId, ...(await this.notify.hrUserIds(actor.companyId))],
        'Ponto fora do local permitido',
        ` bateu o ponto a ${describeDistance(verdict.distanceMeters ?? 0)} de ${verdict.fence?.name ?? 'o local permitido'}. Justificativa: ${justification ?? '-'}`,
        '/dashboard/escalas?view=aprovacoes',
        true,
      );
    }
    if (flags.length) {
      this.logger.warn(`Batida sinalizada ${flags.join(',')} employee=${employee.id}`);
    }
    const next = nextPunchType(track as any);
    return {
      receipt,
      type,
      label: PUNCH_TYPE_LABEL[type],
      occurredAt,
      flags,
      pendingApproval: outOfFence,
      address,
      next: next ? { type: next, label: PUNCH_TYPE_LABEL[next] } : null,
      eventId: event.id,
    };
  }

  /** Atraso esperado (min) da entrada de hoje versus agora; usado só para exibição. */
  async expectedEntryDelay(actor: JwtUser) {
    const employee = await this.employeeFor(actor);
    const day = await this.days.resolveDay(actor.companyId, employee.id, toDateOnly(new Date()));
    if (!day.entry) return null;
    const now = new Date();
    const nowHm = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(now);
    return minutesBetween(day.entry, nowHm);
  }
}
