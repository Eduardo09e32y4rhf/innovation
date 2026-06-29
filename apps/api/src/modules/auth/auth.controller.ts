import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimitGuard, RateLimit } from '../../common/guards/rate-limit.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @UseGuards(RateLimitGuard)
  @RateLimit({ window: 60, max: 3, prefix: 'register' })
  @Post('register-company')
  registerCompany(@Body() dto: RegisterCompanyDto) {
    return this.service.registerCompany(dto);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ window: 60, max: 5, prefix: 'login' })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() request: any) {
    return this.service.login(dto, getRequestMeta(request));
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ window: 60, max: 3, prefix: 'pwd-reset-req' })
  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto, @Req() request: any) {
    return this.service.requestPasswordReset(dto, getRequestMeta(request));
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ window: 60, max: 3, prefix: 'pwd-reset-cfm' })
  @Post('password-reset/confirm')
  resetPassword(@Body() dto: ResetPasswordDto, @Req() request: any) {
    return this.service.resetPassword(dto, getRequestMeta(request));
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto, @Req() request: any) {
    return this.service.changePassword(user, dto, getRequestMeta(request));
  }
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.service.me(user);
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