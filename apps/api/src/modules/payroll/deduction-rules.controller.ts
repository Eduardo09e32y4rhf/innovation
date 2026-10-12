import { BadRequestException, Body, ForbiddenException, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { validateRule } from './deduction-rules';

const clean = (v: unknown) => String(v ?? '').trim();
const date = (v: unknown) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00.000Z`) : null);

/** Regras de desconto da empresa (benefícios etc.): geral, por cargo, por setor ou por pessoa. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH', 'CEO', 'CONTABIL')
@Controller('deduction-rules')
export class DeductionRulesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentCompany() companyId: string) {
    const [rules, positions, departments] = await Promise.all([
      this.prisma.payrollDeductionRule.findMany({ where: { companyId }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] }),
      this.prisma.employee.findMany({ where: { companyId, status: { not: 'TERMINATED' }, position: { not: '' } }, select: { position: true }, distinct: ['position'], orderBy: { position: 'asc' } }),
      this.prisma.employee.findMany({ where: { companyId, status: { not: 'TERMINATED' }, department: { not: '' } }, select: { department: true }, distinct: ['department'], orderBy: { department: 'asc' } }),
    ]);
    return { rules: rules.map((r) => ({ ...r, value: Number(r.value), maxAmount: r.maxAmount === null ? null : Number(r.maxAmount) })), positions: positions.map((p) => p.position), departments: departments.map((d) => d.department) };
  }

  private payload(body: any) {
    const problem = validateRule({ name: body?.name, kind: body?.kind, value: body?.value, base: body?.base, scope: body?.scope, targets: body?.targets, category: body?.category, maxAmount: body?.maxAmount, startDate: body?.startDate ?? null, endDate: body?.endDate ?? null });
    if (problem) throw new BadRequestException(problem);
    const scope = body.scope ?? 'ALL';
    return {
      name: clean(body.name).slice(0, 80), category: body.category ?? 'BENEFIT', kind: body.kind, value: Number(body.value), base: body.kind === 'PERCENT' ? (body.base ?? 'GROSS') : 'GROSS',
      maxAmount: body.maxAmount === '' || body.maxAmount === null || body.maxAmount === undefined ? null : Number(body.maxAmount),
      scope, targets: scope === 'ALL' ? [] : [...new Set<string>((body.targets ?? []).map(clean).filter(Boolean))].slice(0, 200),
      startDate: date(body.startDate), endDate: date(body.endDate), isActive: body.isActive !== false,
    };
  }

  @Post()
  async create(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() body: any) {
    this.assertWriter(actor);
    const created = await this.prisma.payrollDeductionRule.create({ data: { companyId, createdByUserId: actor.sub, ...this.payload(body) } });
    await this.prisma.auditLog.create({ data: { companyId, userId: actor.sub, action: 'DEDUCTION_RULE_CREATED', entity: 'PayrollDeductionRule', entityId: created.id, metadata: { name: created.name, scope: created.scope, kind: created.kind, value: Number(created.value) } } });
    return created;
  }

  @Patch(':id')
  async update(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    this.assertWriter(actor);
    const current = await this.prisma.payrollDeductionRule.findFirst({ where: { id, companyId } });
    if (!current) throw new NotFoundException('Regra não encontrada.');
    const merged = { ...current, value: Number(current.value), maxAmount: current.maxAmount === null ? null : Number(current.maxAmount), startDate: current.startDate?.toISOString().slice(0, 10) ?? null, endDate: current.endDate?.toISOString().slice(0, 10) ?? null, ...body };
    const updated = await this.prisma.payrollDeductionRule.update({ where: { id }, data: this.payload(merged) });
    await this.prisma.auditLog.create({ data: { companyId, userId: actor.sub, action: 'DEDUCTION_RULE_UPDATED', entity: 'PayrollDeductionRule', entityId: id, metadata: { name: updated.name, active: updated.isActive } } });
    return updated;
  }

  @Delete(':id')
  async remove(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    this.assertWriter(actor);
    const result = await this.prisma.payrollDeductionRule.deleteMany({ where: { id, companyId } });
    if (!result.count) throw new NotFoundException('Regra não encontrada.');
    await this.prisma.auditLog.create({ data: { companyId, userId: actor.sub, action: 'DEDUCTION_RULE_DELETED', entity: 'PayrollDeductionRule', entityId: id } });
    return { deleted: true };
  }

  /** Contábil e CEO só consultam; quem muda é RH, Administrador ou Dev. */
  private assertWriter(actor: JwtUser) {
    if (!['DEV', 'ADMIN', 'RH'].includes(actor.role)) throw new ForbiddenException('Seu perfil só consulta os descontos. Peça ao RH ou ao administrador.');
  }
}

