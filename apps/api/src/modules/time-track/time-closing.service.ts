import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { TimeClosingStatus } from '@prisma/client';

@Injectable()
export class TimeClosingService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    return this.prisma.timeClosingPeriod.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(companyId: string, id: string) {
    const period = await this.prisma.timeClosingPeriod.findFirst({ where: { id, companyId } });
    if (!period) throw new NotFoundException('Closing period not found');
    return period;
  }

  async getByReference(companyId: string, referenceMonth: number, referenceYear: number) {
    return this.prisma.timeClosingPeriod.findFirst({
      where: { companyId, referenceMonth, referenceYear },
    });
  }

  async generate(companyId: string, actor: JwtUser, referenceMonth: number, referenceYear: number) {
    const rule = await this.prisma.workScheduleRule.findFirst({ where: { companyId, status: 'ACTIVE' } });
    if (!rule) throw new BadRequestException('No active work schedule rule found');

    const existing = await this.getByReference(companyId, referenceMonth, referenceYear);
    if (existing) throw new BadRequestException('Closing period already exists for this reference');

    // Calculate period based on rule
    const year = referenceYear;
    const month = referenceMonth;
    const startDay = rule.closingStartDay;
    const endDay = rule.closingEndDay;

    let periodStart: Date;
    let periodEnd: Date;

    if (startDay <= endDay) {
      periodStart = new Date(year, month - 1, startDay);
      periodEnd = new Date(year, month - 1, endDay, 23, 59, 59);
    } else {
      periodStart = new Date(year, month - 1, startDay);
      periodEnd = new Date(year, month, endDay, 23, 59, 59);
    }

    return this.prisma.timeClosingPeriod.create({
      data: {
        companyId,
        referenceMonth,
        referenceYear,
        periodStart,
        periodEnd,
        status: 'OPEN',
      },
    });
  }

  async close(companyId: string, actor: JwtUser, id: string) {
    const period = await this.getById(companyId, id);
    if (period.status === 'CLOSED') throw new BadRequestException('Period already closed');
    return this.prisma.timeClosingPeriod.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedByUserId: actor.sub,
        closedAt: new Date(),
      },
    });
  }

  async reopen(companyId: string, actor: JwtUser, id: string, reason: string) {
    const period = await this.getById(companyId, id);
    if (period.status !== 'CLOSED') throw new BadRequestException('Only closed periods can be reopened');
    return this.prisma.timeClosingPeriod.update({
      where: { id },
      data: {
        status: 'REOPENED',
        reopenedByUserId: actor.sub,
        reopenReason: reason,
      },
    });
  }

  async approve(companyId: string, actor: JwtUser, id: string) {
    const period = await this.getById(companyId, id);
    return this.prisma.timeClosingPeriod.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }
}