import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
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


@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Get('public-plans')
  publicPlans() {
    return this.service.publicPlans();
  }

  @Throttle({ default: { limit: 3, ttl: 1800000 } })
  @Post('register-company')
  registerCompany(@Body() dto: RegisterCompanyDto) {
    return this.service.registerCompany(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() request: any) {
    return this.service.login(dto, getRequestMeta(request));
  }

  @Throttle({ default: { limit: 5, ttl: 1800000 } })
  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto, @Req() request: any) {
    return this.service.requestPasswordReset(dto, getRequestMeta(request));
  }

  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @Post('password-reset/validate-code')
  validateResetCode(@Body() dto: { email: string; code: string; cpfStart: string; registration: string }) {
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
    return this.service.changePassword(user, dto, getRequestMeta(request));
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