import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import type { JwtUser } from '../../common/types/auth.types';
import {
  BulkApplicationsDto,
  InterviewDto,
  MoveApplicationDto,
  NoteDto,
  SaveCriteriaDto,
  SaveEvaluationsDto,
  SavePipelineDto,
  SaveQuestionsDto,
  SavedViewDto,
  SetApplicationTagsDto,
  TagDto,
  UpdateApplicationMetaDto,
} from './dto/recruitment.dto';
import { JobScopeService } from './job-scope.service';
import { RecruitmentService, type ApplicationFilters } from './recruitment.service';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule('recruitment')
@Roles('DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR')
@Controller('jobs')
export class RecruitmentController {
  constructor(private readonly service: RecruitmentService, private readonly scope: JobScopeService) {}

  @Get('pipeline')
  pipeline(@CurrentCompany() companyId: string) {
    return this.service.getPipeline(companyId);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Put('pipeline')
  savePipeline(@CurrentCompany() companyId: string, @Body() dto: SavePipelineDto) {
    return this.service.savePipeline(companyId, dto);
  }

  @Get('stats')
  stats(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.stats(companyId, this.scope.scope(actor));
  }

  /** Banco de talentos e acao em lote exigem capacidade propria: fora do RH_RS. */
  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR')
  @Get('talent')
  talent(@CurrentCompany() companyId: string, @Query('q') q?: string) {
    return this.service.talentPool(companyId, q);
  }

  @Get('tags')
  tags(@CurrentCompany() companyId: string) {
    return this.service.listTags(companyId);
  }

  @Post('tags')
  createTag(@CurrentCompany() companyId: string, @Body() dto: TagDto) {
    return this.service.createTag(companyId, dto);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Delete('tags/:id')
  deleteTag(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.deleteTag(companyId, id);
  }

  @Get('views')
  views(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.listViews(companyId, actor.sub);
  }

  @Post('views')
  createView(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: SavedViewDto) {
    return this.service.createView(companyId, actor.sub, dto);
  }

  @Delete('views/:id')
  deleteView(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.deleteView(companyId, actor.sub, id);
  }

  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR')
  @Post('applications/bulk')
  bulk(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: BulkApplicationsDto) {
    return this.service.bulk(companyId, actor.sub, dto);
  }

  @Get('applications/:id')
  async application(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.service.getApplication(companyId, id);
  }

  @Patch('applications/:id/stage')
  async move(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Body() dto: MoveApplicationDto,
  ) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.service.moveApplication(companyId, actor.sub, id, dto);
  }

  @Patch('applications/:id/favorite')
  async favorite(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: UpdateApplicationMetaDto) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.service.setFavorite(companyId, id, dto.favorite !== false);
  }

  @Post('applications/:id/notes')
  async note(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: NoteDto) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.service.addNote(companyId, actor.sub, id, dto.body);
  }

  @Put('applications/:id/evaluations')
  async evaluations(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Body() dto: SaveEvaluationsDto,
  ) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.service.saveEvaluations(companyId, actor.sub, id, dto);
  }

  @Post('applications/:id/interviews')
  async interview(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Body() dto: InterviewDto,
  ) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.service.addInterview(companyId, actor.sub, id, dto);
  }

  @Delete('applications/:id/interviews/:interviewId')
  async removeInterview(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Param('interviewId') interviewId: string) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.service.deleteInterview(companyId, id, interviewId);
  }

  @Put('applications/:id/tags')
  async applicationTags(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: SetApplicationTagsDto) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.service.setApplicationTags(companyId, id, dto.tagIds);
  }

  @Get(':jobId/questions')
  async questions(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('jobId') jobId: string) {
    await this.scope.assertJob(companyId, actor, jobId);
    return this.service.getQuestions(companyId, jobId);
  }

  @Put(':jobId/questions')
  async saveQuestions(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('jobId') jobId: string, @Body() dto: SaveQuestionsDto) {
    await this.scope.assertJob(companyId, actor, jobId);
    return this.service.saveQuestions(companyId, jobId, dto);
  }

  @Get(':jobId/criteria')
  async criteria(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('jobId') jobId: string) {
    await this.scope.assertJob(companyId, actor, jobId);
    return this.service.getCriteria(companyId, jobId);
  }

  @Put(':jobId/criteria')
  async saveCriteria(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('jobId') jobId: string, @Body() dto: SaveCriteriaDto) {
    await this.scope.assertJob(companyId, actor, jobId);
    return this.service.saveCriteria(companyId, jobId, dto);
  }

  @Get(':jobId/applications/export')
  async exportCsv(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('jobId') jobId: string,
    @Query() query: ApplicationFilters,
    @Res() reply: any,
  ) {
    await this.scope.assertJob(companyId, actor, jobId);
    const csv = await this.service.exportCsv(companyId, jobId, query);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="candidatos.csv"');
    return reply.send(csv);
  }

  @Get(':jobId/applications')
  async applications(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('jobId') jobId: string, @Query() query: ApplicationFilters) {
    await this.scope.assertJob(companyId, actor, jobId);
    return this.service.listApplications(companyId, jobId, query);
  }
}
