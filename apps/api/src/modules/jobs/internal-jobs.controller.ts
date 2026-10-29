import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { Throttle } from '@nestjs/throttler';
import { TurnstileGuard } from '../../common/turnstile/turnstile.guard';
import { InternalApplyDto, InternalJobsService, PublicInternalApplyDto } from './internal-jobs.service';

/** Processo interno: funcionário vê as vagas internas e se candidata pela matrícula; RH/R&S/Gestor também inscrevem por matrícula. */
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule('recruitment')
@Roles('DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO')
@Controller('internal-jobs')
export class InternalJobsController {
  constructor(private readonly service: InternalJobsService) {}

  @Get()
  open(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) { return this.service.openJobs(companyId, actor); }

  @Get('lookup')
  lookup(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Query('registration') registration: string) { return this.service.lookup(companyId, actor, registration); }

  @Post(':jobId/apply')
  apply(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('jobId', ParseUUIDPipe) jobId: string, @Body() dto: InternalApplyDto) { return this.service.apply(companyId, actor, jobId, dto); }
}


/** Link publico da vaga interna (QR code/WhatsApp interno): so funcionarios, validados por matricula + CPF. */
@Controller('public/internal-jobs')
export class PublicInternalJobsController {
  constructor(private readonly service: InternalJobsService) {}

  @Get(':jobId') @Throttle({ default: { limit: 30, ttl: 60000 } })
  job(@Param('jobId', ParseUUIDPipe) jobId: string) { return this.service.publicJob(jobId); }

  /** Limite baixo: impede testar matricula/CPF em sequencia. */
  @Post(':jobId/apply') @UseGuards(TurnstileGuard) @Throttle({ default: { limit: 5, ttl: 60000 } })
  apply(@Param('jobId', ParseUUIDPipe) jobId: string, @Body() dto: PublicInternalApplyDto) { return this.service.applyPublic(jobId, dto); }
}
