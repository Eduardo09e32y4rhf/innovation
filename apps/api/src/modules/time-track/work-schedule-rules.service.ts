import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { TimeRuleStatus } from '@prisma/client';

@Injectable()
export class WorkScheduleRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, actor: JwtUser) {
    const where: any = { companyId };
    if (actor.role === 'GESTOR') {
      const employee = await this.prisma.employee.findFirst({ where: { userId: actor.sub, companyId } });
      if (!employee) throw new NotFoundException('Employee not found');
    }
    return this.prisma.workScheduleRule.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findActive(companyId: string) {
    return this.prisma.workScheduleRule.findFirst({ where: { companyId, status: 'ACTIVE' } });
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
    const existing = await this.getById(companyId, id);
    return this.prisma.workScheduleRule.update({ where: { id }, data });
  }

  async delete(companyId: string, actor: JwtUser, id: string) {
    if (actor.role !== 'ADMIN' && actor.role !== 'RH' && actor.role !== 'DEV') {
      throw new ForbiddenException('Only ADMIN/RH can delete rules');
    }
    await this.getById(companyId, id);
    await this.prisma.workScheduleRule.delete({ where: { id } });
    return { ok: true };
  }
}