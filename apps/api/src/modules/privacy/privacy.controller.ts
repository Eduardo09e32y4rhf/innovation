import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { PrivacyService } from './privacy.service';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AcceptTermsDto {
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() photoBase64?: string;
  @IsOptional() faceDescriptor?: number[];
}

@UseGuards(JwtAuthGuard)
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly service: PrivacyService) {}

  @Get('terms/status')
  status(@CurrentUser() user: JwtUser) {
    return this.service.status(user);
  }

  @Post('terms/accept')
  accept(@CurrentUser() user: JwtUser, @Req() request: any, @Body() body: AcceptTermsDto) {
    return this.service.accept(user, getRequestMeta(request), body);
  }

  @Get('terms/download/:userId')
  async downloadTerms(@CurrentUser() user: JwtUser, @Req() request: any) {
    const userId = request.params.userId;
    const base64Pdf = await this.service.getTermsPdf(user, userId);
    if (!base64Pdf) return { success: false, message: 'PDF não encontrado' };
    
    const buffer = Buffer.from(base64Pdf, 'base64');
    const response = request.res;
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename=Termo_De_Uso_${userId}.pdf`);
    response.send(buffer);
  }
}

function getRequestMeta(request: any) {
  const forwardedFor = request.headers['x-forwarded-for'];
  const ipAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim() || request.ip;

  return {
    ipAddress,
    userAgent: request.headers['user-agent'],
  };
}
