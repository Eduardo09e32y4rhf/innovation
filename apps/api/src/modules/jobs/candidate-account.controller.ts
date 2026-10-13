import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CandidateAuthGuard } from './candidate-account.guard';
import { CandidateAccountService } from './candidate-account.service';
import { CandidateApplyDto, CandidateRequestCodeDto, CandidateUpdateProfileDto, CandidateVerifyCodeDto } from './dto/candidate-account.dto';

/** Área do candidato: conta única com perfil mínimo, reaproveitável em qualquer empresa. Rotas separadas do login de empresa. */
@Controller('candidate-portal')
export class CandidateAccountController {
  constructor(private readonly service: CandidateAccountService) {}

  @Post('auth/request-code')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  requestCode(@Body() dto: CandidateRequestCodeDto) {
    return this.service.requestCode(dto.email);
  }

  @Post('auth/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  verify(@Body() dto: CandidateVerifyCodeDto) {
    return this.service.verifyCode(dto.email, dto.code);
  }

  @UseGuards(CandidateAuthGuard)
  @Post('auth/logout')
  @HttpCode(200)
  logout(@Req() request: any) {
    return this.service.logout(request.candidateToken);
  }

  @UseGuards(CandidateAuthGuard)
  @Get('me')
  me(@Req() request: any) {
    return this.service.profile(request.candidateAccount);
  }

  @UseGuards(CandidateAuthGuard)
  @Put('me')
  update(@Req() request: any, @Body() dto: CandidateUpdateProfileDto) {
    return this.service.updateProfile(request.candidateAccount, dto);
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

  /** "Sim, reutilizar meus dados": envia o perfil salvo + respostas das perguntas da vaga (se houver). */
  @UseGuards(CandidateAuthGuard)
  @Post('jobs/:jobId/apply')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  apply(@Req() request: any, @Param('jobId', new ParseUUIDPipe()) jobId: string, @Body() dto: CandidateApplyDto) {
    return this.service.applyWithProfile(request.candidateAccount, jobId, dto);
  }
}
