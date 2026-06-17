import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { PrivacyService } from './privacy.service';

@ApiBearerAuth()
@ApiTags('privacy')
@UseGuards(JwtAuthGuard)
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly service: PrivacyService) {}

  @Get('terms/status')
  status(@CurrentUser() user: JwtUser) {
    return this.service.status(user);
  }

  @Post('terms/accept')
  accept(@CurrentUser() user: JwtUser, @Req() request: any) {
    return this.service.accept(user, getRequestMeta(request));
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
