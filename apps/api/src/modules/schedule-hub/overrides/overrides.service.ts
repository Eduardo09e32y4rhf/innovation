import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PrismaService } from '../../../database/prisma.service';
import type { JwtUser } from '../../../common/types/auth.types';
import { ScheduleScopeService } from '../../schedule/access/schedule-scope.service';
import { dateKey, parseDateOnly } from '../calendar/day-resolver';
import { HubNotifyService } from '../notify.service';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const OVERRIDE_TYPES = ['FOLGA', 'COMPENSACAO', 'ATESTADO', 'SUSPENSAO', 'FERIADO_LOCAL'] as const;

export class CreateOverrideDto {
  @IsUUID() employeeId!: string;
  @IsDateString() date!: string;
  @IsIn(OVERRIDE_TYPES as unknown as string[]) type!: (typeof OVERRIDE_TYPES)[number];
  @IsOptional() @Matches(HHMM) altEntry?: string;
  @IsOptional() @Matches(HHMM) altExit?: string;
  @IsString() @MaxLength(300) reason!: string;
}

@Injectable()
export class OverridesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScheduleScopeService,
    private readonly notify: HubNotifyService,
  ) {}

  private async assertOpen(companyId: string, employeeId: string, when: Date) {
    const closed = await this.prisma.timeClosing.findFirst({
      where: { companyId, employeeId, status: { not: 'DRAFT' }, periodStart: { lte: when }, periodEnd: { gte: when } },
      select: { id: true },
    });
    if (closed) throw new BadRequestException('Este periodo ja esta em revisao ou fechado. Reabra o fechamento antes de alterar a escala.');
  }

  async create(actor: JwtUser, dto: CreateOverrideDto) {
    await this.scope.assertEmployee(actor, 'schedule.write', dto.employeeId);
    if (!dto.reason.trim()) throw new BadRequestException('Informe o motivo.');
    const when = parseDateOnly(dto.date);
    await this.assertOpen(actor.companyId, dto.employeeId, when);

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.scheduleException.deleteMany({ where: { companyId: actor.companyId, employeeId: dto.employeeId, date: when, exceptionType: { in: ['FOLGA', 'COMPENSACAO', 'AJUSTE_ESCALA', dto.type] } } });
      return tx.scheduleException.create({
        data: {
          companyId: actor.companyId, employeeId: dto.employeeId, date: when, exceptionType: dto.type, reason: dto.reason.trim(),
          altEntryTime: dto.type === 'COMPENSACAO' ? dto.altEntry ?? null : null, altExitTime: dto.type === 'COMPENSACAO' ? dto.altExit ?? null : null,
          createdByUserId: actor.sub,
        },
      });
    });
    await this.prisma.auditLog.create({ data: { companyId: actor.companyId, userId: actor.sub, action: 'SCHEDULE_OVERRIDE_CREATED', entity: 'ScheduleException', entityId: created.id, metadata: { employeeId: dto.employeeId, date: dto.date, type: dto.type } } });
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId }, select: { userId: true } });
    await this.notify.notify(actor.companyId, [employee?.userId], 'Sua escala foi alterada', `${dto.date.slice(0, 10)}: ${dto.type.toLowerCase().replace('_', ' ')}. Motivo: ${dto.reason.trim()}`, '/dashboard/escalas');
    return created;
  }

  async remove(actor: JwtUser, id: string) {
    const exception = await this.prisma.scheduleException.findFirst({ where: { id, companyId: actor.companyId } });
    if (!exception) throw new NotFoundException('Ajuste nao encontrado.');
    await this.scope.assertEmployee(actor, 'schedule.write', exception.employeeId);
    await this.assertOpen(actor.companyId, exception.employeeId, exception.date);
    await this.prisma.scheduleException.delete({ where: { id } });
    await this.prisma.auditLog.create({ data: { companyId: actor.companyId, userId: actor.sub, action: 'SCHEDULE_OVERRIDE_REMOVED', entity: 'ScheduleException', entityId: id, metadata: { employeeId: exception.employeeId, date: dateKey(exception.date) } } });
    return { deleted: true };
  }
}
