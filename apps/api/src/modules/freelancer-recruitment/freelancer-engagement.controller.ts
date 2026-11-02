import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { AddApplicationNoteDto } from './dto/add-application-note.dto';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { DelegateJobDto, SetDelegationGrantsDto } from './dto/delegate-job.dto';
import { FreelancerEngagementService } from './freelancer-engagement.service';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule('recruitment')
@Roles('DEV', 'ADMIN', 'GESTOR', 'RH', 'RH_RS')
@Controller('freelancer')
export class FreelancerEngagementController {
  constructor(private readonly service: FreelancerEngagementService) {}

  /** Criar/renegociar contrato e decisao comercial: so GESTOR/ADMIN/DEV, nunca a recrutadora. */
  @Roles('DEV', 'ADMIN', 'GESTOR')
  @Post('engagements')
  create(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: CreateEngagementDto) {
    return this.service.create(companyId, actor, dto);
  }

  @Get('engagements')
  list(@CurrentUser() actor: JwtUser) {
    return this.service.list(actor);
  }

  @Roles('DEV', 'ADMIN', 'GESTOR')
  @Patch('engagements/:id/accept')
  accept(@Param('id') id: string, @CurrentUser() actor: JwtUser) {
    return this.service.accept(id, actor);
  }

  @Roles('DEV', 'ADMIN', 'GESTOR')
  @Patch('engagements/:id/end')
  end(@Param('id') id: string, @CurrentUser() actor: JwtUser) {
    return this.service.end(id, actor);
  }

  @Post('engagements/:id/delegations')
  delegate(@Param('id') id: string, @CurrentUser() actor: JwtUser, @Body() dto: DelegateJobDto) {
    return this.service.delegateJob(id, actor, dto);
  }

  @Patch('delegations/:id/revoke')
  revoke(@Param('id') id: string, @CurrentUser() actor: JwtUser) {
    return this.service.revokeDelegation(id, actor);
  }

  @Patch('delegations/:id/hired')
  markHired(@Param('id') id: string, @CurrentUser() actor: JwtUser) {
    return this.service.markHired(id, actor);
  }

  @Roles('DEV', 'ADMIN', 'GESTOR')
  @Put('delegations/:id/grants')
  setGrants(@Param('id') id: string, @CurrentUser() actor: JwtUser, @Body() dto: SetDelegationGrantsDto) {
    return this.service.setDelegationGrants(id, actor, dto.userIds);
  }

  @Get('delegations/:id/grants')
  listGrants(@Param('id') id: string) {
    return this.service.listGrants(id);
  }

  /** Vagas delegadas a MINHA empresa (visao do freelancer). */
  @Get('jobs')
  listJobs(@CurrentUser() actor: JwtUser) {
    return this.service.listDelegatedJobs(actor);
  }

  @Get('jobs/:jobId')
  getJob(@Param('jobId') jobId: string, @CurrentUser() actor: JwtUser) {
    return this.service.getDelegatedJob(actor, jobId);
  }

  @Post('applications/:applicationId/notes')
  addNote(@Param('applicationId') applicationId: string, @CurrentUser() actor: JwtUser, @Body() dto: AddApplicationNoteDto) {
    return this.service.addApplicationNote(actor, applicationId, dto.body);
  }
}
