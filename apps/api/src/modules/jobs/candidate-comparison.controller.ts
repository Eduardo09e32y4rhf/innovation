import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { parseCompareIds } from './candidate-comparison';
import { CandidateComparisonService } from './candidate-comparison.service';
import { JobScopeService } from './job-scope.service';

/** Comparacao lado a lado de candidatos de uma vaga (leitura agregada). Gestor e RH - R&S so veem vagas do proprio escopo. */
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule('recruitment')
@Roles('DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR')
@Controller('jobs')
export class CandidateComparisonController {
  constructor(private readonly service: CandidateComparisonService, private readonly scope: JobScopeService) {}

  @Get(':jobId/compare')
  async compare(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('jobId', ParseUUIDPipe) jobId: string, @Query('ids') ids?: string) {
    const parsed = parseCompareIds(ids);
    await this.scope.assertJob(companyId, actor, jobId);
    return this.service.compare(companyId, actor, jobId, parsed);
  }
}
