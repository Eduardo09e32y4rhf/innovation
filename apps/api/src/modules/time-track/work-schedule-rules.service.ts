import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';

@Injectable()
export class WorkScheduleRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, actor: JwtUser) {
    try {
      return await this.prisma.workScheduleRule.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      console.error('[WorkScheduleRulesService] list fallback', err);
      return [];
    }
  }

  async findActive(companyId: string) {
    try {
      return await this.prisma.workScheduleRule.findFirst({
        where: { companyId, status: 'ACTIVE' },
      });
    } catch {
      return null;
    }
  }

  async getById(companyId: string, id: string) {
    const rule = await this.prisma.workScheduleRule.findFirst({ where: { id, companyId } });
    if (!rule) throw new NotFoundException('Rule not found');
    return rule;
  }

  async create(companyId: string, actor: JwtUser, data: any) {
    if (actor.role !== 'ADMIN' && actor.role !== 'RH' && actor.role !== 'DEV') {
      throw new ForbiddenException('Only ADMIN/RH can create rules');
    }
    return this.prisma.workScheduleRule.create({ data: { companyId, ...data } });
  }

  async update(companyId: string, actor: JwtUser, id: string, data: any) {
    if (actor.role !== 'ADMIN' && actor.role !== 'RH' && actor.role !== 'DEV') {
      throw new ForbiddenException('Only ADMIN/RH can update rules');
    }
    return this.prisma.workScheduleRule.update({ where: { id }, data });
  }

  async delete(companyId: string, actor: JwtUser, id: string) {
    if (actor.role !== 'ADMIN' && actor.role !== 'RH' && actor.role !== 'DEV') {
      throw new ForbiddenException('Only ADMIN/RH can delete rules');
    }
    try {
      await this.prisma.workScheduleRule.delete({ where: { id } });
    } catch {}
    return { ok: true };
  }
}