import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { AssessmentsService } from './assessments.service';
import { InterviewFollowupService } from './interview-followup.service';
import { JobOfferService } from './job-offer.service';
import { JobScopeService } from './job-scope.service';

class SlotOfferDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(8) @IsDateString({}, { each: true }) slots!: string[];
  @IsIn(['PRESENCIAL', 'ONLINE']) mode!: 'PRESENCIAL' | 'ONLINE';
  @IsOptional() @IsString() @MaxLength(300) location?: string;
  @IsOptional() @IsString() @MaxLength(600) meetingUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(480) durationMinutes?: number;
  @IsOptional() @IsIn(['RH', 'GESTOR']) interviewerRole?: 'RH' | 'GESTOR';
  @IsOptional() @IsString() @MaxLength(120) interviewer?: string;
  @IsOptional() @IsString() @MaxLength(1000) candidateMessage?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(14) validDays?: number;
}

class RatingDto {
  @IsUUID() criterionId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) score!: number;
}
class FeedbackDto {
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => RatingDto) ratings!: RatingDto[];
  @IsIn(['STRONG_YES', 'YES', 'NO', 'STRONG_NO']) recommendation!: string;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
}

class OfferDto {
  @IsOptional() @IsString() @MaxLength(160) positionTitle?: string;
  @IsIn(['CLT', 'PJ', 'ESTAGIO', 'TEMPORARIO', 'APRENDIZ', 'AUTONOMO']) contractType!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(10_000_000) salary?: number | null;
  @IsOptional() @IsString() @MaxLength(10) startDate?: string | null;
  @IsOptional() @IsString() @MaxLength(200) workSchedule?: string | null;
  @IsOptional() @IsString() @MaxLength(40) workMode?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(120, { each: true }) benefits?: string[];
  @IsOptional() @IsString() @MaxLength(3000) message?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30) validDays?: number;
}
class OfferNoteDto { @IsString() @MaxLength(1000) note!: string; }

class AssessmentDto {
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(3000) instructions?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(240) timeLimitMinutes?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) passingScore?: number;
  @IsOptional() @IsBoolean() autoReject?: boolean;
  @IsArray() @ArrayMaxSize(60) questions!: unknown[];
}
class SendAssessmentDto {
  @IsIn(['TECHNICAL', 'BEHAVIORAL']) kind!: 'TECHNICAL' | 'BEHAVIORAL';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(14) validDays?: number;
}

/** RH: autoagendamento, avaliacao por entrevistador, proposta e testes. Escopo de vaga do RH - R&S respeitado. */
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule('recruitment')
@Roles('DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR')
@Controller('jobs')
export class CandidateActionsController {
  constructor(
    private readonly followup: InterviewFollowupService,
    private readonly offers: JobOfferService,
    private readonly assessments: AssessmentsService,
    private readonly scope: JobScopeService,
  ) {}

  // autoagendamento
  @Roles('DEV', 'ADMIN', 'RH', 'RH_RS')
  @Post('applications/:id/slot-offers')
  async slotOffer(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SlotOfferDto) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.followup.createSlotOffer(companyId, actor.sub, id, dto);
  }

  @Get('applications/:id/slot-offers')
  async slotOffers(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.followup.listSlotOffers(companyId, id);
  }

  @Roles('DEV', 'ADMIN', 'RH', 'RH_RS')
  @HttpCode(200)
  @Post('applications/:id/slot-offers/:offerId/cancel')
  async cancelSlotOffer(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Param('offerId', ParseUUIDPipe) offerId: string) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.followup.cancelSlotOffer(companyId, id, offerId);
  }

  // avaliacao por entrevistador (gestor tambem avalia)
  @Get('applications/:id/interview-feedback')
  async feedback(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.followup.listFeedback(companyId, actor.sub, id);
  }

  @Put('applications/:id/interviews/:interviewId/feedback')
  async saveFeedback(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Param('interviewId', ParseUUIDPipe) interviewId: string, @Body() dto: FeedbackDto) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.followup.saveFeedback(companyId, actor.sub, id, interviewId, dto);
  }

  // proposta
  @Get('applications/:id/offers')
  async offersList(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.offers.list(companyId, actor, id);
  }

  @Roles('DEV', 'ADMIN', 'RH', 'RH_RS')
  @Post('applications/:id/offers')
  async createOffer(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: OfferDto) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.offers.create(companyId, actor, id, dto);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @HttpCode(200)
  @Post('offers/:offerId/approve')
  approveOffer(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('offerId', ParseUUIDPipe) offerId: string) {
    return this.offers.approve(companyId, actor, offerId);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @HttpCode(200)
  @Post('offers/:offerId/return')
  returnOffer(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('offerId', ParseUUIDPipe) offerId: string, @Body() dto: OfferNoteDto) {
    return this.offers.reject(companyId, actor, offerId, dto.note);
  }

  @Roles('DEV', 'ADMIN', 'RH', 'RH_RS')
  @HttpCode(200)
  @Post('offers/:offerId/send')
  sendOffer(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('offerId', ParseUUIDPipe) offerId: string) {
    return this.offers.send(companyId, actor, offerId);
  }

  @Roles('DEV', 'ADMIN', 'RH', 'RH_RS')
  @HttpCode(200)
  @Post('offers/:offerId/cancel')
  cancelOffer(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('offerId', ParseUUIDPipe) offerId: string) {
    return this.offers.cancel(companyId, actor, offerId);
  }

  // testes
  @Get(':jobId/assessment')
  async jobAssessment(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('jobId', ParseUUIDPipe) jobId: string) {
    await this.scope.assertJob(companyId, actor, jobId);
    return (await this.assessments.getJobAssessment(companyId, jobId)) ?? { questions: [] };
  }

  @Roles('DEV', 'ADMIN', 'RH', 'RH_RS')
  @Put(':jobId/assessment')
  async saveJobAssessment(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('jobId', ParseUUIDPipe) jobId: string, @Body() dto: AssessmentDto) {
    await this.scope.assertJob(companyId, actor, jobId);
    return (await this.assessments.saveJobAssessment(companyId, jobId, dto)) ?? { questions: [] };
  }

  @Roles('DEV', 'ADMIN', 'RH', 'RH_RS')
  @Post('applications/:id/assessments')
  async sendAssessment(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SendAssessmentDto) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.assessments.send(companyId, actor.sub, id, dto);
  }

  @Get('applications/:id/assessments')
  async assessmentsList(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.assessments.list(companyId, id);
  }

  @Roles('DEV', 'ADMIN', 'RH', 'RH_RS')
  @HttpCode(200)
  @Post('applications/:id/assessments/:inviteId/cancel')
  async cancelAssessment(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Param('inviteId', ParseUUIDPipe) inviteId: string) {
    await this.scope.assertApplication(companyId, actor, id);
    return this.assessments.cancel(companyId, id, inviteId);
  }
}

class InterviewResponseDto {
  @IsIn(['CONFIRMED', 'DECLINED']) response!: 'CONFIRMED' | 'DECLINED';
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
class BookSlotDto { @IsDateString() slot!: string; }
class OfferResponseDto {
  @IsBoolean() accept!: boolean;
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}
class SubmitAssessmentDto { @IsObject() answers!: Record<string, unknown>; }

/** Paginas do candidato abertas pelos links do e-mail (sem login; o link secreto e a chave). */
@Controller('public/recruitment')
export class PublicCandidateActionsController {
  constructor(private readonly followup: InterviewFollowupService, private readonly offers: JobOfferService, private readonly assessments: AssessmentsService) {}

  @Get('interview/:token') @Throttle({ default: { limit: 30, ttl: 60000 } })
  interview(@Param('token') token: string) { return this.followup.publicInterview(token); }

  @Post('interview/:token') @Throttle({ default: { limit: 10, ttl: 60000 } })
  respondInterview(@Param('token') token: string, @Body() dto: InterviewResponseDto) { return this.followup.respond(token, dto); }

  @Get('slots/:token') @Throttle({ default: { limit: 30, ttl: 60000 } })
  slots(@Param('token') token: string) { return this.followup.publicSlotOffer(token); }

  @Post('slots/:token') @Throttle({ default: { limit: 10, ttl: 60000 } })
  book(@Param('token') token: string, @Body() dto: BookSlotDto) { return this.followup.bookSlot(token, dto.slot); }

  @Get('offer/:token') @Throttle({ default: { limit: 30, ttl: 60000 } })
  offer(@Param('token') token: string) { return this.offers.publicOffer(token); }

  @Post('offer/:token') @Throttle({ default: { limit: 10, ttl: 60000 } })
  respondOffer(@Param('token') token: string, @Body() dto: OfferResponseDto) { return this.offers.respond(token, dto); }

  @Get('assessment/:token') @Throttle({ default: { limit: 30, ttl: 60000 } })
  assessment(@Param('token') token: string) { return this.assessments.publicAssessment(token); }

  @HttpCode(200)
  @Post('assessment/:token/start') @Throttle({ default: { limit: 10, ttl: 60000 } })
  start(@Param('token') token: string) { return this.assessments.start(token); }

  @HttpCode(200)
  @Post('assessment/:token/submit') @Throttle({ default: { limit: 10, ttl: 60000 } })
  submit(@Param('token') token: string, @Body() dto: SubmitAssessmentDto) { return this.assessments.submit(token, dto.answers); }
}
