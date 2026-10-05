import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
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
import { RecruitmentService, type ApplicationFilters } from './recruitment.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR')
@Controller('jobs')
export class RecruitmentController {
  constructor(private readonly service: RecruitmentService) {}

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
  stats(@CurrentCompany() companyId: string) {
    return this.service.stats(companyId);
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
  application(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.getApplication(companyId, id);
  }

  @Patch('applications/:id/stage')
  move(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Body() dto: MoveApplicationDto,
  ) {
    return this.service.moveApplication(companyId, actor.sub, id, dto);
  }

  @Patch('applications/:id/favorite')
  favorite(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateApplicationMetaDto) {
    return this.service.setFavorite(companyId, id, dto.favorite !== false);
  }

  @Post('applications/:id/notes')
  note(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: NoteDto) {
    return this.service.addNote(companyId, actor.sub, id, dto.body);
  }

  @Put('applications/:id/evaluations')
  evaluations(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Body() dto: SaveEvaluationsDto,
  ) {
    return this.service.saveEvaluations(companyId, actor.sub, id, dto);
  }

  @Post('applications/:id/interviews')
  interview(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Body() dto: InterviewDto,
  ) {
    return this.service.addInterview(companyId, actor.sub, id, dto);
  }

  @Delete('applications/:id/interviews/:interviewId')
  removeInterview(@CurrentCompany() companyId: string, @Param('id') id: string, @Param('interviewId') interviewId: string) {
    return this.service.deleteInterview(companyId, id, interviewId);
  }

  @Put('applications/:id/tags')
  applicationTags(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: SetApplicationTagsDto) {
    return this.service.setApplicationTags(companyId, id, dto.tagIds);
  }

  @Get(':jobId/questions')
  questions(@CurrentCompany() companyId: string, @Param('jobId') jobId: string) {
    return this.service.getQuestions(companyId, jobId);
  }

  @Put(':jobId/questions')
  saveQuestions(@CurrentCompany() companyId: string, @Param('jobId') jobId: string, @Body() dto: SaveQuestionsDto) {
    return this.service.saveQuestions(companyId, jobId, dto);
  }

  @Get(':jobId/criteria')
  criteria(@CurrentCompany() companyId: string, @Param('jobId') jobId: string) {
    return this.service.getCriteria(companyId, jobId);
  }

  @Put(':jobId/criteria')
  saveCriteria(@CurrentCompany() companyId: string, @Param('jobId') jobId: string, @Body() dto: SaveCriteriaDto) {
    return this.service.saveCriteria(companyId, jobId, dto);
  }

  @Get(':jobId/applications/export')
  async exportCsv(
    @CurrentCompany() companyId: string,
    @Param('jobId') jobId: string,
    @Query() query: ApplicationFilters,
    @Res() reply: any,
  ) {
    const csv = await this.service.exportCsv(companyId, jobId, query);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="candidatos.csv"');
    return reply.send(csv);
  }

  @Get(':jobId/applications')
  applications(@CurrentCompany() companyId: string, @Param('jobId') jobId: string, @Query() query: ApplicationFilters) {
    return this.service.listApplications(companyId, jobId, query);
  }
}
