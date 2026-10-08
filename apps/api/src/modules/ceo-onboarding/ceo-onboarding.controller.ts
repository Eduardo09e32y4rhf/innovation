import { BadRequestException, Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { contentDisposition } from '../../common/pdf/pdf-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CeoOnboardingService } from './ceo-onboarding.service';
import { UpdateCeoProfileDto } from './dto/update-ceo-profile.dto';
import { IssueCeoContractDto } from './dto/issue-ceo-contract.dto';
import { ConfirmCeoContractDto } from './dto/confirm-ceo-contract.dto';
import { MAX_SIGNED_PDF_BYTES } from './signed-pdf.rules';

@Controller('ceo-onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CeoOnboardingController {
  constructor(private readonly service: CeoOnboardingService) {}
  @Get('state') @Roles('CEO') state(@CurrentUser() actor: JwtUser) { return this.service.state(actor); }
  @Patch('profile') @Roles('CEO') profile(@CurrentUser() actor: JwtUser, @Body() dto: UpdateCeoProfileDto) { return this.service.updateProfile(actor, dto); }
  @Post(':ceoUserId/contract') @Roles('DEV') issue(@CurrentUser() actor: JwtUser, @Param('ceoUserId') ceoUserId: string, @Body() dto: IssueCeoContractDto) { return this.service.issueContract(actor, ceoUserId, dto); }

  // Assinatura pelo gov.br: baixar a minuta, assinar em assinador.iti.br e enviar o PDF assinado.
  @Get('contracts/pending-verification') @Roles('DEV') pending(@CurrentUser() actor: JwtUser) { return this.service.pendingVerification(actor); }

  @Get('contract/:contractId/pdf') @Roles('CEO', 'DEV') @Header('Cache-Control', 'private, no-store')
  async original(@CurrentUser() actor: JwtUser, @Param('contractId', ParseUUIDPipe) contractId: string, @Res() reply: any) {
    return this.sendPdf(reply, await this.service.contractFile(actor, contractId, 'original'));
  }

  @Get('contract/:contractId/signed-pdf') @Roles('CEO', 'DEV') @Header('Cache-Control', 'private, no-store')
  async signed(@CurrentUser() actor: JwtUser, @Param('contractId', ParseUUIDPipe) contractId: string, @Res() reply: any) {
    return this.sendPdf(reply, await this.service.contractFile(actor, contractId, 'signed'));
  }

  @Post('contract/:contractId/signed') @Roles('CEO', 'DEV')
  async upload(@CurrentUser() actor: JwtUser, @Param('contractId', ParseUUIDPipe) contractId: string, @Req() request: any) {
    if (!request.isMultipart?.()) throw new BadRequestException('Envie o PDF assinado como arquivo.');
    let file: Buffer | undefined;
    try {
      for await (const part of request.parts({ limits: { fileSize: MAX_SIGNED_PDF_BYTES, files: 1, fields: 1 } })) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          if (part.file?.truncated) throw new BadRequestException('O arquivo deve ter no maximo 10 MB.');
          if (buffer.length && !file) file = buffer;
        }
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Nao foi possivel ler o arquivo enviado. Tente novamente.');
    }
    if (!file) throw new BadRequestException('Envie o PDF assinado.');
    return this.service.uploadSigned(actor, contractId, file);
  }

  @Post('contract/:contractId/confirm') @Roles('DEV')
  confirm(@CurrentUser() actor: JwtUser, @Param('contractId', ParseUUIDPipe) contractId: string, @Body() dto: ConfirmCeoContractDto) {
    return this.service.confirm(actor, contractId, dto);
  }

  private sendPdf(reply: any, file: { buffer: Buffer; name: string }) {
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', contentDisposition(file.name));
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Cache-Control', 'private, no-store');
    return reply.send(file.buffer);
  }
}