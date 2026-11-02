import { Body, Controller, Get, HttpCode, Param, Put, Query, Res, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { APPLICATION_SOURCES } from './application-source';
import { JobAuditService } from './job-audit.service';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { JobScopeService } from './job-scope.service';
import { RecruitmentMetricsService } from './recruitment-metrics.service';

/** Perfis que veem valores de custo (dado financeiro). */
const COST_ROLES = ['DEV', 'ADMIN', 'RH'];

class SourceCostDto {
  @IsIn(APPLICATION_SOURCES as unknown as string[]) source!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) amount!: number;
}
class JobCostsDto {
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) costAmount?: number | null;
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => SourceCostDto) sources!: SourceCostDto[];
}

/** Relatórios do recrutamento. Gestor e recrutador veem só as vagas do próprio escopo. */
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule('recruitment')
@Roles('DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR')
@Controller('recruitment-metrics')
export class RecruitmentMetricsController {
  constructor(private readonly service: RecruitmentMetricsService, private readonly scope: JobScopeService, private readonly audit: JobAuditService) {}

  @Get()
  metrics(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Query('from') from?: string, @Query('to') to?: string, @Query('jobId', new ParseUUIDPipe({ optional: true })) jobId?: string) {
    const valid = (value?: string) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);
    return this.service.metrics(companyId, this.scope.scope(actor), { from: valid(from), to: valid(to), jobId: jobId && /^[0-9a-f-]{36}$/i.test(jobId) ? jobId : undefined }, { includeCosts: COST_ROLES.includes(actor.role) });
  }

  /** Mesmos números da tela, em CSV (UTF-8 com BOM, separador ;). */
  @Get('export')
  async export(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Res() reply: any, @Query('from') from?: string, @Query('to') to?: string, @Query('jobId', new ParseUUIDPipe({ optional: true })) jobId?: string) {
    const valid = (value?: string) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);
    const csv = await this.service.exportCsv(companyId, this.scope.scope(actor), { from: valid(from), to: valid(to), jobId }, { includeCosts: COST_ROLES.includes(actor.role) });
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="relatorio-recrutamento.csv"');
    return reply.send(csv);
  }

  /** Custos da vaga (financeiro): só RH, administrador e DEV. */
  @Roles('DEV', 'ADMIN', 'RH')
  @Get('jobs/:jobId/costs')
  async costs(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('jobId', ParseUUIDPipe) jobId: string) {
    await this.scope.assertJob(companyId, actor, jobId);
    return this.service.costs(companyId, jobId);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @HttpCode(200)
  @Put('jobs/:jobId/costs')
  async saveCosts(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('jobId', ParseUUIDPipe) jobId: string, @Body() dto: JobCostsDto) {
    await this.scope.assertJob(companyId, actor, jobId);
    const saved = await this.service.saveCosts(companyId, jobId, dto);
    await this.audit.record(companyId, actor.sub, 'JOB_COST_UPDATED', jobId, { sources: dto.sources.map((row) => row.source), fixedCostChanged: dto.costAmount !== undefined });
    return saved;
  }
}
