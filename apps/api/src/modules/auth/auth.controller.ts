import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminResetEmployeePasswordDto } from './dto/admin-reset-employee-password.dto';
import { PublicPlanQuoteDto } from './dto/public-plan-quote.dto';
import { MfaCodeDto, MfaVerifyDto, VerifyEmailDto } from './dto/mfa.dto';
import { MfaService } from './mfa.service';
import { ValidateResetCodeDto } from './dto/validate-reset-code.dto';


@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService, private readonly mfa: MfaService) {}

  @Get('public-plans')
  publicPlans() {
    return this.service.publicPlans();
  }

  @Post('public-plans/quote')
  quotePublicPlan(@Body() dto: PublicPlanQuoteDto) {
    return this.service.quotePublicPlan(dto);
  }

  @Throttle({ default: { limit: 3, ttl: 1800000 } })
  @Post('register-company')
  async registerCompany(@Body() dto: RegisterCompanyDto, @Req() request: any, @Res({ passthrough: true }) reply: any) {
    return withRefreshCookie(reply, await this.service.registerCompany(dto, getRequestMeta(request)));
  }

  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: any, @Res({ passthrough: true }) reply: any) {
    return withRefreshCookie(reply, await this.service.login(dto, getRequestMeta(request)));
  }

  /** Segunda etapa do login (código do app autenticador ou código de recuperação). */
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @Post('mfa/verify')
  async verifyMfa(@Body() dto: MfaVerifyDto, @Req() request: any, @Res({ passthrough: true }) reply: any) {
    return withRefreshCookie(reply, await this.service.verifyMfaLogin(dto, getRequestMeta(request)));
  }

  /** Troca o refresh token (cookie httpOnly) por um novo access token curto. */
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  async refresh(@Req() request: any, @Res({ passthrough: true }) reply: any) {
    try {
      return withRefreshCookie(reply, await this.service.refresh(request.cookies?.[REFRESH_COOKIE], getRequestMeta(request)));
    } catch (error) {
      clearRefreshCookie(reply);
      throw error;
    }
  }

  @Post('logout')
  async logout(@Req() request: any, @Res({ passthrough: true }) reply: any) {
    const result = await this.service.logout(request.cookies?.[REFRESH_COOKIE]);
    clearRefreshCookie(reply);
    return result;
  }

  @Throttle({ default: { limit: 10, ttl: 600000 } })
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.service.verifyEmail(dto.token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  resendVerification(@CurrentUser() user: JwtUser) {
    return this.service.resendVerification(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  sessions(@CurrentUser() user: JwtUser, @Req() request: any) {
    return this.service.listSessions(user.sub, request.cookies?.[REFRESH_COOKIE]);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/revoke-others')
  revokeOthers(@CurrentUser() user: JwtUser, @Req() request: any) {
    return this.service.revokeOtherSessions(user.sub, request.cookies?.[REFRESH_COOKIE]);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  revokeSession(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.revokeSession(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mfa/status')
  mfaStatus(@CurrentUser() user: JwtUser) {
    return this.mfa.status(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  @Post('mfa/setup')
  mfaSetup(@CurrentUser() user: JwtUser) {
    return this.mfa.setup(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  @Post('mfa/enable')
  async mfaEnable(@CurrentUser() user: JwtUser, @Body() dto: MfaCodeDto, @Req() request: any, @Res({ passthrough: true }) reply: any) {
    return withRefreshCookie(reply, await this.service.mfaEnable(user, dto.code, getRequestMeta(request), request.cookies?.[REFRESH_COOKIE]));
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/disable')
  async mfaDisable(@CurrentUser() user: JwtUser) {
    await this.mfa.disable(user.sub);
    return { disabled: true };
  }

  @Throttle({ default: { limit: 5, ttl: 1800000 } })
  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto, @Req() request: any) {
    if (dto.website) {
      return { requested: true, message: 'Operação recebida' }; // Silently reject bots
    }
    return this.service.requestPasswordReset(dto, getRequestMeta(request));
  }

  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @Post('password-reset/validate-code')
  validateResetCode(@Body() dto: ValidateResetCodeDto) {
    return this.service.validateResetCode(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @Post('password-reset/confirm')
  resetPassword(@Body() dto: ResetPasswordDto, @Req() request: any) {
    return this.service.resetPassword(dto, getRequestMeta(request));
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto, @Req() request: any) {
    return this.service.changePassword(user, dto, getRequestMeta(request), request.cookies?.[REFRESH_COOKIE]);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RH', 'DEV')
  @Get('password-reset/employees')
  searchEmployeesForPasswordReset(
    @CurrentUser() user: JwtUser,
    @Query('search') search = '',
  ) {
    return this.service.searchEmployeesForPasswordReset(
      user,
      search,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RH', 'DEV')
  @Post('password-reset/employee')
  adminResetEmployeePassword(
    @CurrentUser() user: JwtUser,
    @Body() dto: AdminResetEmployeePasswordDto,
    @Req() request: any,
  ) {
    return this.service.adminResetEmployeePassword(
      user,
      dto.employeeId,
      dto.newPassword,
      getRequestMeta(request),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.service.me(user);
  }
}

function getRequestMeta(request: any) {
  const forwardedFor = request.headers['x-forwarded-for'];
  const cfIp = request.headers['cf-connecting-ip'];
  const realIp = request.headers['x-real-ip'];

  let ipAddress = cfIp || realIp;
  if (!ipAddress) {
    ipAddress = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim() || request.ip;
  }

  return {
    ipAddress: ipAddress || 'unknown',
    userAgent: request.headers['user-agent'] || 'unknown',
  };
}

const REFRESH_COOKIE = 'irh_rt';

function refreshCookieOptions() {
  const days = Math.max(1, Number(process.env.REFRESH_TTL_DAYS ?? 30) || 30);
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: days * 86_400 };
}

/** O refresh token vai SOMENTE no cookie httpOnly; nunca no corpo da resposta. */
function withRefreshCookie<T extends Record<string, any>>(reply: any, result: T): Omit<T, 'refreshToken'> {
  if (result && typeof result === 'object' && 'refreshToken' in result) {
    const { refreshToken, ...rest } = result as any;
    if (refreshToken) reply.setCookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    return rest;
  }
  return result;
}

function clearRefreshCookie(reply: any) {
  reply.clearCookie(REFRESH_COOKIE, { path: '/' });
}