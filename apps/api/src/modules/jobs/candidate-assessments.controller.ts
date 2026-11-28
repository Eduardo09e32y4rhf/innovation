import { Body, Controller, Get, Header, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CandidateAuthGuard } from './candidate-account.guard';
import { CandidateAssessmentsService } from './candidate-assessments.service';
import { SaveCandidateAssessmentDto, ShareCandidateAssessmentDto } from './dto/candidate-assessment.dto';

@Controller('candidate-portal/assessments')
@UseGuards(CandidateAuthGuard)
export class CandidateAssessmentsController {
  constructor(private readonly service: CandidateAssessmentsService) {}
  @Get() @Header('Cache-Control', 'private, no-store')
  list(@Req() request: any) { return this.service.list(request.candidateAccount.id); }
  @Post(':kind/start') @Throttle({ default: { limit: 15, ttl: 60000 } }) @Header('Cache-Control', 'private, no-store')
  start(@Req() request: any, @Param('kind') kind: string) { return this.service.start(request.candidateAccount.id, kind); }
  @Put(':kind') @Throttle({ default: { limit: 60, ttl: 60000 } }) @Header('Cache-Control', 'private, no-store')
  save(@Req() request: any, @Param('kind') kind: string, @Body() dto: SaveCandidateAssessmentDto) { return this.service.save(request.candidateAccount.id, kind, dto); }
  @Put(':kind/sharing') @Header('Cache-Control', 'private, no-store')
  share(@Req() request: any, @Param('kind') kind: string, @Body() dto: ShareCandidateAssessmentDto) { return this.service.share(request.candidateAccount.id, kind, dto.shareConsent); }
}
