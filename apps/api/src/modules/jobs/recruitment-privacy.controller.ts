import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { TurnstileGuard } from '../../common/turnstile/turnstile.guard';
import { clientIp } from '../../common/http/client-ip';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, MaxLength, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CandidateConsentService } from './candidate-consent.service';
import { RecruitmentPrivacyService } from './recruitment-privacy.service';

class SettingsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(3) @Max(60) retentionMonths?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(7) @Max(365) trackingTokenDays?: number;
  @IsOptional() @IsBoolean() receiptEmail?: boolean;
  @IsOptional() @IsBoolean() rejectionEmail?: boolean;
  @IsOptional() @IsString() @MaxLength(1500) rejectionMessage?: string;
}
class AnswerDto {
  @IsString() @MaxLength(2000) response!: string;
  @IsOptional() @IsBoolean() perform?: boolean;
}
class ConfirmRequestDto {
  @IsString() @MaxLength(100) token!: string;
}
class PublicRequestDto {
  @IsEmail() @MaxLength(240) email!: string;
  @IsIn(['ACCESS', 'CORRECTION', 'DELETION']) type!: string;
  @IsOptional() @IsString() @MaxLength(1500) message?: string;
}

/** Área do RH: retenção, e-mails automáticos e pedidos do titular (LGPD). */
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule('recruitment')
@Roles('DEV', 'ADMIN', 'RH')
@Controller('recruitment-privacy')
export class RecruitmentPrivacyController {
  constructor(private readonly service: RecruitmentPrivacyService) {}

  @Get('settings') settings(@CurrentCompany() companyId: string) { return this.service.getSettings(companyId); }
  @Put('settings') save(@CurrentCompany() companyId: string, @Body() dto: SettingsDto) { return this.service.saveSettings(companyId, dto); }
  @Get('requests') requests(@CurrentCompany() companyId: string, @Query('status') status?: string) { return this.service.listRequests(companyId, status); }
  @Get('requests/:id/export') exportData(@CurrentCompany() companyId: string, @Param('id', ParseUUIDPipe) id: string) { return this.service.exportCandidateData(companyId, id); }
  @Post('requests/:id/answer') answer(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AnswerDto) { return this.service.answerRequest(companyId, id, actor.sub, dto); }
}

/** Páginas públicas do candidato: acompanhar status e pedir seus direitos de titular. */
@Controller('public')
export class PublicCandidateController {
  constructor(private readonly service: RecruitmentPrivacyService, private readonly consents: CandidateConsentService) {}

  @Get('candidate-status/:token')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  status(@Param('token') token: string) { return this.service.publicStatus(token); }

  /** RS-C-01: so envia o link de confirmacao ao e-mail; o pedido abre depois, em candidate-requests/confirm. */
  @Post('candidate-requests')
  @HttpCode(200)
  @UseGuards(TurnstileGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  request(@Body() dto: PublicRequestDto, @Req() req: any) { return this.service.createRequest(dto, { ip: clientIp(req) }); }

  @Post('candidate-requests/confirm')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  confirm(@Body() dto: ConfirmRequestDto) { return this.service.confirmRequest(dto.token); }

  /** RS-D-06 / RS-C-18: links do recibo de consentimento (confirmar o banco de talentos, revogar). Token de 64 hex; so o hash fica no banco. */
  @Post('consents/confirm')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  confirmConsent(@Body() dto: ConfirmRequestDto) { return this.consents.confirm(dto.token); }

  @Post('consents/revoke')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  revokeConsent(@Body() dto: ConfirmRequestDto) { return this.consents.revoke(dto.token); }
}
