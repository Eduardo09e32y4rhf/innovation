import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { clientIp } from '../../common/http/client-ip';
import { lookupCep } from '../lookup/lookup.controller';
import { TurnstileGuard } from '../../common/turnstile/turnstile.guard';
import { CandidateAuthGuard } from './candidate-account.guard';
import { CandidateAccountService } from './candidate-account.service';
import { CandidateApplyDto, CandidateVerifyEmailDto, CandidateEmailDto, CandidateLoginDto, CandidateRegisterDto, CandidateResetPasswordDto, CandidateUpdateProfileDto } from './dto/candidate-account.dto';

const reqCtx = (request: any) => ({ ip: clientIp(request), userAgent: typeof request.headers?.['user-agent'] === 'string' ? request.headers['user-agent'] : undefined });

/** Área do candidato: conta única com perfil mínimo, reaproveitável em qualquer empresa. Rotas separadas do login de empresa. */
@Controller('candidate-portal')
export class CandidateAccountController {
  constructor(private readonly service: CandidateAccountService) {}

  @UseGuards(TurnstileGuard)
  @Post('auth/register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Body() dto: CandidateRegisterDto) {
    return this.service.register(dto.email, dto.password, dto.name);
  }

  @UseGuards(TurnstileGuard)
  @Post('auth/login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body() dto: CandidateLoginDto) {
    return this.service.login(dto.email, dto.password);
  }

  @UseGuards(TurnstileGuard)
  @Post('auth/forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  forgot(@Body() dto: CandidateEmailDto) {
    return this.service.requestPasswordReset(dto.email);
  }

  @Post('auth/reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  reset(@Body() dto: CandidateResetPasswordDto) {
    return this.service.resetPassword(dto.email, dto.code, dto.password);
  }

  @UseGuards(CandidateAuthGuard)
  @Post('auth/logout')
  @HttpCode(200)
  logout(@Req() request: any) {
    return this.service.logout(request.candidateToken);
  }

  @UseGuards(CandidateAuthGuard)
  @Post('auth/verify-email')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  verifyEmail(@Req() request: any, @Body() dto: CandidateVerifyEmailDto) {
    return this.service.verifyEmail(request.candidateAccount, dto.code);
  }

  @UseGuards(CandidateAuthGuard)
  @Post('auth/resend-verification')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  resendVerification(@Req() request: any) {
    return this.service.resendVerification(request.candidateAccount);
  }

  @UseGuards(CandidateAuthGuard)
  @Get('me')
  me(@Req() request: any) {
    return this.service.profile(request.candidateAccount);
  }

  /** Preenche rua, bairro, cidade e UF pelo CEP. */
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseGuards(CandidateAuthGuard)
  @Get('cep/:cep')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  cep(@Param('cep') cep: string) {
    return lookupCep(cep);
  }

  @UseGuards(CandidateAuthGuard)
  @Put('me')
  update(@Req() request: any, @Body() dto: CandidateUpdateProfileDto) {
    return this.service.updateProfile(request.candidateAccount, dto, reqCtx(request));
  }

  @UseGuards(CandidateAuthGuard)
  @Put('me/resume')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async resume(@Req() request: any) {
    if (!request.isMultipart?.()) throw new BadRequestException('Envie o currículo como arquivo (PDF ou DOCX).');
    let file: { buffer: Buffer; filename: string } | undefined;
    try {
      for await (const part of request.parts({ limits: { fileSize: 5 * 1024 * 1024, files: 1 } })) {
        if (part.type !== 'file') continue;
        const buffer = await part.toBuffer();
        if (part.file?.truncated) throw new BadRequestException('O currículo deve ter no máximo 5 MB.');
        if (buffer.length && !file) file = { buffer, filename: part.filename };
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      if (error?.code === 'FST_REQ_FILE_TOO_LARGE') throw new BadRequestException('O currículo deve ter no máximo 5 MB.');
      throw new BadRequestException('Não foi possível ler o arquivo enviado. Tente novamente.');
    }
    return this.service.saveResume(request.candidateAccount, file);
  }

  @UseGuards(CandidateAuthGuard)
  @Delete('me')
  remove(@Req() request: any) {
    return this.service.deleteAccount(request.candidateAccount);
  }

  @UseGuards(CandidateAuthGuard)
  @Get('applications')
  applications(@Req() request: any) {
    return this.service.applications(request.candidateAccount);
  }

  @UseGuards(CandidateAuthGuard)
  @Post('applications/:id/withdraw')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  withdraw(@Req() request: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.withdraw(request.candidateAccount, id);
  }

  @UseGuards(CandidateAuthGuard)
  @Get('consents')
  consents(@Req() request: any) {
    return this.service.consentList(request.candidateAccount);
  }

  @UseGuards(CandidateAuthGuard)
  @Post('consents/:id/revoke')
  @HttpCode(200)
  revokeConsent(@Req() request: any, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.consentRevoke(request.candidateAccount, id);
  }

  @UseGuards(CandidateAuthGuard)
  @Get('invites')
  invites(@Req() request: any) {
    return this.service.invites(request.candidateAccount);
  }

  @UseGuards(CandidateAuthGuard)
  @Post('invites/:inviteId/decline')
  @HttpCode(200)
  declineInvite(@Req() request: any, @Param('inviteId', new ParseUUIDPipe()) inviteId: string) {
    return this.service.declineInvite(request.candidateAccount, inviteId);
  }

  /** "Sim, reutilizar meus dados": envia o perfil salvo + respostas das perguntas da vaga (se houver). */
  @UseGuards(CandidateAuthGuard)
  @Post('jobs/:jobId/apply')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  apply(@Req() request: any, @Param('jobId', new ParseUUIDPipe()) jobId: string, @Body() dto: CandidateApplyDto) {
    return this.service.applyWithProfile(request.candidateAccount, jobId, dto, reqCtx(request));
  }
}
