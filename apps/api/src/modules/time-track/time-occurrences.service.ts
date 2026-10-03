import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { ScheduleScopeService } from '../schedule/access/schedule-scope.service';
import { CreateOccurrenceDto } from './dto/occurrence.dto';

@Injectable()
export class TimeOccurrencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScheduleScopeService,
  ) {}

  async list(actor: JwtUser, employeeId?: string) {
    const allowed = await this.scope.allowedEmployeeIds(actor, 'calendar.read');
    if (employeeId && allowed !== null && !allowed.includes(employeeId)) {
      return [];
    }
    const where: any = { companyId: actor.companyId };
    if (employeeId) where.employeeId = employeeId;
    else if (allowed !== null) where.employeeId = { in: allowed };
    return this.prisma.timeOccurrence.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
  }

  async getById(actor: JwtUser, id: string) {
    const occurrence = await this.prisma.timeOccurrence.findFirst({ where: { id, companyId: actor.companyId } });
    if (!occurrence) throw new NotFoundException('Ocorrencia nao encontrada.');
    await this.scope.assertEmployee(actor, 'calendar.read', occurrence.employeeId);
    return occurrence;
  }

  async create(actor: JwtUser, dto: CreateOccurrenceDto) {
    await this.scope.assertEmployee(actor, 'schedule.write', dto.employeeId);
    const date = new Date(dto.date);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Data invalida.');
    return this.prisma.timeOccurrence.create({
      data: {
        companyId: actor.companyId,
        employeeId: dto.employeeId,
        type: dto.type as any,
        date,
        minutes: dto.minutes,
        reason: dto.reason?.trim() || null,
        observation: dto.observation?.trim() || null,
        createdByUserId: actor.sub,
        status: 'APPROVED',
        approvedByUserId: actor.sub,
        approvedAt: new Date(),
      },
    });
  }

  private async decide(actor: JwtUser, id: string, status: 'APPROVED' | 'REJECTED') {
    const occurrence = await this.prisma.timeOccurrence.findFirst({ where: { id, companyId: actor.companyId } });
    if (!occurrence) throw new NotFoundException('Ocorrencia nao encontrada.');
    await this.scope.assertEmployee(actor, 'approvals', occurrence.employeeId);
    if (occurrence.status !== 'PENDING') throw new BadRequestException('Esta ocorrencia ja foi decidida.');
    return this.prisma.timeOccurrence.update({
      where: { id },
      data: { status, approvedByUserId: actor.sub, approvedAt: new Date() },
    });
  }

  approve(actor: JwtUser, id: string) {
    return this.decide(actor, id, 'APPROVED');
  }

  reject(actor: JwtUser, id: string) {
    return this.decide(actor, id, 'REJECTED');
  }
}
