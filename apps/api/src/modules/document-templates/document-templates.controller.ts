import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { malformedPlaceholders, renderTemplate, TEMPLATE_KINDS, TEMPLATE_VARIABLES, unknownVariables, validateTemplate } from './template-render';
import { CreateDocumentTemplateDto, RenderDocumentTemplateDto, UpdateDocumentTemplateDto } from './document-template.dto';

const clean = (v: unknown) => String(v ?? '').trim();
const br = (iso?: string | null) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
const addDays = (iso: string, days: number) => new Date(new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

/** Modelos de documento da empresa: RH/Administrador criam; quem lança comunicados escolhe na hora de enviar. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH')
@Controller('document-templates')
export class DocumentTemplatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentCompany() companyId: string, @Query('kind') kind?: string) {
    const templates = await this.prisma.documentTemplate.findMany({ where: { companyId, ...(kind && TEMPLATE_KINDS.includes(kind as any) ? { kind } : {}) }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
    return { templates, variables: TEMPLATE_VARIABLES, kinds: TEMPLATE_KINDS };
  }

  private payload(body: any) {
    const problem = validateTemplate({ name: body?.name, kind: body?.kind, title: body?.title, body: body?.body });
    if (problem) throw new BadRequestException(problem);
    return { name: clean(body.name).slice(0, 100), kind: body.kind as string, title: clean(body.title).slice(0, 150), body: clean(body.body), isActive: body.isActive !== false };
  }

  @Post()
  async create(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() body: CreateDocumentTemplateDto) {
    const created = await this.prisma.documentTemplate.create({ data: { companyId, createdByUserId: actor.sub, ...this.payload(body) } });
    await this.prisma.auditLog.create({ data: { companyId, userId: actor.sub, action: 'DOCUMENT_TEMPLATE_CREATED', entity: 'DocumentTemplate', entityId: created.id, metadata: { name: created.name, kind: created.kind } } });
    return created;
  }

  @Patch(':id')
  async update(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateDocumentTemplateDto) {
    const current = await this.prisma.documentTemplate.findFirst({ where: { id, companyId } });
    if (!current) throw new NotFoundException('Modelo não encontrado.');
    const updated = await this.prisma.documentTemplate.update({ where: { id }, data: this.payload({ ...current, ...body }) });
    await this.prisma.auditLog.create({ data: { companyId, userId: actor.sub, action: 'DOCUMENT_TEMPLATE_UPDATED', entity: 'DocumentTemplate', entityId: id, metadata: { name: updated.name } } });
    return updated;
  }

  @Delete(':id')
  async remove(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.prisma.documentTemplate.deleteMany({ where: { id, companyId } });
    if (!result.count) throw new NotFoundException('Modelo não encontrado.');
    await this.prisma.auditLog.create({ data: { companyId, userId: actor.sub, action: 'DOCUMENT_TEMPLATE_DELETED', entity: 'DocumentTemplate', entityId: id } });
    return { deleted: true };
  }

  /** Texto do modelo já com os dados do funcionário e da empresa (a tela preenche o comunicado com isso). */
  @Post(':id/render')
  async render(@CurrentCompany() companyId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: RenderDocumentTemplateDto) {
    const template = await this.prisma.documentTemplate.findFirst({ where: { id, companyId, isActive: true } });
    if (!template) throw new NotFoundException('Modelo não encontrado ou desligado.');
    // Modelo salvo antes da validação (ou editado direto no banco) nunca pode mandar "{{campo}}" cru para o documento.
    const invalid = [...unknownVariables(`${template.title}\n${template.body}`).map((k) => `{{${k}}}`), ...malformedPlaceholders(`${template.title}\n${template.body}`)];
    if (invalid.length) throw new BadRequestException(`O modelo "${template.name}" tem campo inválido (${invalid.slice(0, 3).join(', ')}). Corrija o modelo antes de gerar o documento.`);
    const [company, employee] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId }, select: { name: true, legalName: true, document: true } }),
      body?.employeeId ? this.prisma.employee.findFirst({ where: { id: body.employeeId, companyId }, select: { name: true, cpf: true, position: true, department: true, registration: true } }) : null,
    ]);
    if (body?.employeeId && !employee) throw new ForbiddenException('Funcionário fora desta empresa.');
    const days = Number(body?.suspensionDays) > 0 ? Number(body.suspensionDays) : null;
    const start = body?.occurrenceDate ? String(body.occurrenceDate).slice(0, 10) : null;
    const vars = {
      nome: employee?.name, cpf: employee?.cpf, cargo: employee?.position, setor: employee?.department, matricula: employee?.registration,
      empresa: company?.legalName ?? company?.name, cnpj: company?.document, hoje: br(todayIso()), data_ocorrencia: br(start), motivo: body?.reason,
      dias_suspensao: days, data_inicio: start && days ? br(start) : '', data_fim: start && days ? br(addDays(start, days - 1)) : '',
    };
    return { title: renderTemplate(template.title, vars), message: renderTemplate(template.body, vars) };
  }
}
