import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicApplyToJobDto } from './dto/public-application.dto';
import { RecruitmentService } from './recruitment.service';

@ApiTags('recruitment-public')
@Controller('recruitment/public')
export class RecruitmentPublicController {
  constructor(private readonly service: RecruitmentService) {}

  @Get('jobs')
  listJobs(@Query('companyId') companyId?: string) {
    return this.service.listPublicJobs(companyId);
  }

  @Get('jobs/:id')
  getJob(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.service.getPublicJob(id, companyId);
  }

  @Post('jobs/:id/apply')
  apply(@Param('id') id: string, @Body() dto: PublicApplyToJobDto, @Query('companyId') companyId?: string) {
    return this.service.applyToJob(id, dto, companyId);
  }
}
