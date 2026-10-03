import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkRuleDto } from './dto/work-rule.dto';

@Injectable()
export class WorkScheduleRulesService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.workScheduleRule.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
  }

  findActive(companyId: string) {
    return this.prisma.workScheduleRule.findFirst({ where: { companyId, status: 'ACTIVE' } });
  }

  async getById(companyId: string, id: string) {
    const rule = await this.prisma.workScheduleRule.findFirst({ where: { id, companyId } });
    if (!rule) throw new NotFoundException('Regra nao encontrada.');
    return rule;
  }

  async create(companyId: string, dto: WorkRuleDto) {
    if (!dto.name?.trim()) throw new BadRequestException('Informe o nome da regra.');
    return this.prisma.workScheduleRule.create({ data: { ...dto, name: dto.name.trim(), companyId } as any });
  }

  async update(companyId: string, id: string, dto: WorkRuleDto) {
    await this.getById(companyId, id);
    return this.prisma.workScheduleRule.update({ where: { id }, data: dto as any });
  }

  async delete(companyId: string, id: string) {
    await this.getById(companyId, id);
    await this.prisma.workScheduleRule.delete({ where: { id } });
    return { ok: true };
  }
}
