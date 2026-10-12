import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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

/** Relatórios do recrutamento. Gestor e recrutador veem só as vagas do próprio escopo. */
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule('recruitment')
@Roles('DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR')
@Controller('recruitment-metrics')
export class RecruitmentMetricsController {
  constructor(private readonly service: RecruitmentMetricsService, private readonly scope: JobScopeService) {}

  @Get()
  metrics(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Query('from') from?: string, @Query('to') to?: string, @Query('jobId') jobId?: string) {
    const valid = (value?: string) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);
    return this.service.metrics(companyId, this.scope.scope(actor), { from: valid(from), to: valid(to), jobId: jobId && /^[0-9a-f-]{36}$/i.test(jobId) ? jobId : undefined });
  }
}