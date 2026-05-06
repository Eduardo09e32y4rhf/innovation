import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateApplicationDto, UpdateApplicationStatusDto } from './dto/application.dto';
import { CreateCandidateDto, UpdateCandidateDto } from './dto/candidate.dto';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { SendCandidateMessageDto } from './dto/send-candidate-message.dto';
import { RecruitmentService } from './recruitment.service';

@ApiBearerAuth()
@ApiTags('recruitment')
@UseGuards(JwtAuthGuard)
@Controller('recruitment')
export class RecruitmentController {
  constructor(private readonly service: RecruitmentService) {}

  @Get('jobs') listJobs(@CurrentCompany() companyId: string) { return this.service.listJobs(companyId); }
  @Post('jobs') createJob(@CurrentCompany() companyId: string, @Body() dto: CreateJobDto) { return this.service.createJob(companyId, dto); }
  @Get('jobs/:id') getJob(@CurrentCompany() companyId: string, @Param('id') id: string) { return this.service.getJob(companyId, id); }
  @Patch('jobs/:id') updateJob(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateJobDto) { return this.service.updateJob(companyId, id, dto); }
  @Delete('jobs/:id') deleteJob(@CurrentCompany() companyId: string, @Param('id') id: string) { return this.service.deleteJob(companyId, id); }

  @Get('candidates') listCandidates(@CurrentCompany() companyId: string) { return this.service.listCandidates(companyId); }
  @Post('candidates') createCandidate(@CurrentCompany() companyId: string, @Body() dto: CreateCandidateDto) { return this.service.createCandidate(companyId, dto); }
  @Get('candidates/:id') getCandidate(@CurrentCompany() companyId: string, @Param('id') id: string) { return this.service.getCandidate(companyId, id); }
  @Patch('candidates/:id') updateCandidate(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateCandidateDto) { return this.service.updateCandidate(companyId, id, dto); }
  @Delete('candidates/:id') deleteCandidate(@CurrentCompany() companyId: string, @Param('id') id: string) { return this.service.deleteCandidate(companyId, id); }
  @Post('candidates/:id/send-message') sendCandidateMessage(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: SendCandidateMessageDto) {
    return this.service.sendCandidateMessage(companyId, id, dto);
  }

  @Get('applications') listApplications(@CurrentCompany() companyId: string) { return this.service.listApplications(companyId); }
  @Post('applications') createApplication(@CurrentCompany() companyId: string, @Body() dto: CreateApplicationDto) { return this.service.createApplication(companyId, dto); }
  @Patch('applications/:id/status') updateApplicationStatus(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateApplicationStatusDto) {
    return this.service.updateApplicationStatus(companyId, id, dto);
  }
}
