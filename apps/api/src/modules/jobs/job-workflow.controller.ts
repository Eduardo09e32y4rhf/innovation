import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards, HttpCode } from '@nestjs/common';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { JobScopeService } from './job-scope.service';
import { JobTemplatesService } from './job-templates.service';
import { JobWorkflowService } from './job-workflow.service';

class StepsDto { @IsArray() @IsString({ each: true }) steps!: string[]; }
class DecideDto { @IsBoolean() approve!: boolean; @IsOptional() @IsString() @MaxLength(500) note?: string; }
class BudgetDto { @IsString() @MinLength(1) @MaxLength(120) department!: string; @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000) budget?: number | null; }
class TemplateDto { @IsString() @MinLength(2) @MaxLength(80) name!: string; @IsString() jobId!: string; }

/** Requisição de vaga (aprovação), orçamento por área e modelos de vaga. */
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule('recruitment')
@Roles('DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR', 'CEO', 'CONTABIL')
@Controller('job-workflow')
export class JobWorkflowController {
  constructor(private readonly workflow: JobWorkflowService, private readonly templates: JobTemplatesService, private readonly scope: JobScopeService) {}

  @Get('steps') steps(@CurrentCompany() companyId: string) { return this.workflow.getSteps(companyId).then((steps) => ({ steps })); }
  @Roles('DEV', 'ADMIN', 'RH') @Put('steps') saveSteps(@CurrentCompany() companyId: string, @Body() dto: StepsDto) { return this.workflow.setSteps(companyId, dto.steps); }

  @Get('pending') pending(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) { return this.workflow.pendingFor(companyId, actor); }
  @Get('jobs/:id/approvals') approvals(@CurrentCompany() companyId: string, @Param('id', ParseUUIDPipe) id: string) { return this.workflow.approvals(companyId, id); }
  @HttpCode(200)
  @Post('jobs/:id/decide') decide(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DecideDto) { return this.workflow.decide(companyId, id, actor, dto); }

  @Roles('DEV', 'ADMIN', 'RH', 'CEO', 'CONTABIL') @Get('budgets') budgets(@CurrentCompany() companyId: string) { return this.workflow.budgets(companyId); }
  @Roles('DEV', 'ADMIN', 'RH') @Put('budgets') saveBudget(@CurrentCompany() companyId: string, @Body() dto: BudgetDto) { return this.workflow.saveBudget(companyId, dto.department, dto.budget ?? null); }

  @Roles('DEV', 'ADMIN', 'RH', 'RH_RS') @Get('templates') listTemplates(@CurrentCompany() companyId: string) { return this.templates.list(companyId); }
  @Roles('DEV', 'ADMIN', 'RH', 'RH_RS')
  @Post('templates')
  async createTemplate(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: TemplateDto) { await this.scope.assertJob(companyId, actor, dto.jobId); return this.templates.createFromJob(companyId, actor.sub, dto.jobId, dto.name); }
  @Roles('DEV', 'ADMIN', 'RH') @Delete('templates/:id') removeTemplate(@CurrentCompany() companyId: string, @Param('id', ParseUUIDPipe) id: string) { return this.templates.remove(companyId, id); }
  @Roles('DEV', 'ADMIN', 'RH', 'RH_RS')
  @Post('templates/:id/use')
  async useTemplate(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    const job = await this.templates.use(companyId, id);
    await this.scope.assignCreator(companyId, actor, job.id);
    return job;
  }
}