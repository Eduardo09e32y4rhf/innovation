import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';

@Injectable()
export class TimeClosingService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    try {
      return await this.prisma.timeClosingPeriod.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      console.error('[TimeClosingService] list fallback', err);
      return [];
    }
  }

  async getById(companyId: string, id: string) {
    const period = await this.prisma.timeClosingPeriod.findFirst({ where: { id, companyId } });
    if (!period) throw new NotFoundException('Period not found');
    return period;
  }

  async getByReference(companyId: string, referenceMonth: number, referenceYear: number) {
    try {
      return await this.prisma.timeClosingPeriod.findFirst({ where: { companyId, referenceMonth, referenceYear } });
    } catch {
      return null;
    }
  }

  async generate(companyId: string, actor: JwtUser, referenceMonth: number, referenceYear: number) {
    throw new BadRequestException('Fechamento temporariamente indisponível para configuração inicial.');
  }

  async close(companyId: string, actor: JwtUser, id: string) {
    return this.prisma.timeClosingPeriod.update({ where: { id }, data: { status: 'CLOSED', closedByUserId: actor.sub, closedAt: new Date() } });
  }

  async reopen(companyId: string, actor: JwtUser, id: string, reason: string) {
    return this.prisma.timeClosingPeriod.update({ where: { id }, data: { status: 'REOPENED', reopenedByUserId: actor.sub, reopenReason: reason } });
  }

  async approve(companyId: string, actor: JwtUser, id: string) {
    return this.prisma.timeClosingPeriod.update({ where: { id }, data: { status: 'APPROVED' } });
  }
}