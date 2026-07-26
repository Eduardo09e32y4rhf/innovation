import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateJobDto, UpdateJobDto } from './dto/create-job.dto';
import { HireCandidateDto, UpdateApplicationStatusDto } from './dto/hire-candidate.dto';
import { JobsService } from './jobs.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH', 'GESTOR')
@Controller('jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Get()
  list(@CurrentCompany() companyId: string) {
    return this.service.list(companyId);
  }

  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateJobDto) {
    return this.service.create(companyId, dto);
  }

  @Get(':id')
  get(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.get(companyId, id);
  }

  @Patch(':id')
  update(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  delete(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.delete(companyId, id);
  }

  @Get(':id/applications')
  applications(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.applications(companyId, id);
  }

  @Patch('applications/:id/status')
  move(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.service.updateApplicationStatus(companyId, id, dto.status);
  }

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
    @Param('id') id: string,
    @Res() reply: any,
  ) {
    const file = await this.service.resume(companyId, id);
    reply.header('Content-Type', file.type);
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    return reply.send(file.stream);
  }
}
