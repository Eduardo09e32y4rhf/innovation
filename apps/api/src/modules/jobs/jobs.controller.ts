import { contentDisposition } from '../../common/pdf/pdf-response';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import type { JwtUser } from '../../common/types/auth.types';
import { AssignRecruitersDto } from './dto/assign-recruiters.dto';
import { CreateJobDto, UpdateJobDto } from './dto/create-job.dto';
import { HireCandidateDto } from './dto/hire-candidate.dto';
import { JobScopeService } from './job-scope.service';
import { JobsService } from './jobs.service';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule('recruitment')
@Roles('DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR')
@Controller('jobs')
export class JobsController {
  constructor(private readonly service: JobsService, private readonly scope: JobScopeService) {}

  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.list(companyId, this.scope.scope(actor));
  }

  @Post()
  async create(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: CreateJobDto) {
    const job = await this.service.create(companyId, dto);
    try {
      await this.scope.assignCreator(companyId, actor, job.id);
    } catch (error) {
      // Sem isso a vaga ficava criada (sem responsavel) e o erro 500 levava a nova tentativa, duplicando a vaga.
      await this.service.delete(companyId, job.id).catch(() => undefined);
      throw error;
    }
    return job;
  }

  @Get(':id')
  async get(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    await this.scope.assertJob(companyId, actor, id);
    return this.service.get(companyId, id);
  }

  @Patch(':id')
  async update(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: UpdateJobDto) {
    await this.scope.assertJob(companyId, actor, id);
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    await this.scope.assertJob(companyId, actor, id);
    return this.service.delete(companyId, id);
  }

  @Post(':id/duplicate')
  async duplicate(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    await this.scope.assertJob(companyId, actor, id);
    const copy = await this.service.duplicate(companyId, id);
    await this.scope.assignCreator(companyId, actor, (copy as any).id);
    return copy;
  }

  /** Lista de quem pode ser responsavel (rota estatica: tem prioridade sobre :id). */
  @Roles('DEV', 'ADMIN', 'RH')
  @Get('recruiters/eligible')
  eligibleRecruiters(@CurrentCompany() companyId: string) {
    return this.scope.eligibleRecruiters(companyId);
  }

  /** Atribuicao de responsaveis: quem recruta nao define o proprio escopo. */
  @Roles('DEV', 'ADMIN', 'RH')
  @Get(':id/recruiters')
  recruiters(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.scope.listRecruiters(companyId, actor, id);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Put(':id/recruiters')
  assignRecruiters(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: AssignRecruitersDto) {
    return this.scope.setRecruiters(companyId, actor, id, dto.userIds);
  }

  /** Efetivar cria Employee: RH_RS so seleciona/encaminha, nunca contrata. */
  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR')
  @Post('applications/:id/hire')
  hire(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Body() dto: HireCandidateDto,
  ) {
    return this.service.hire(companyId, id, actor.sub, dto);
  }

  @Get('applications/:id/resume')
  async resume(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Res() reply: any,
  ) {
    await this.scope.assertApplication(companyId, actor, id);
    const file = await this.service.resume(companyId, id);
    reply.header('Content-Type', file.type);
    reply.header('Content-Disposition', contentDisposition(file.name));
    return reply.send(file.stream);
  }
}