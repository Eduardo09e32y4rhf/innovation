import { Body, Controller, Delete, Get, Header, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ActivityQueryDto, LinkEmployeeDto, LinkableQueryDto, PageViewDto, ReasonDto } from './dto/user-actions.dto';
import { UsersActivityService } from './users-activity.service';
import { UsersService } from './users.service';

function requestMeta(request: any) {
  const forwarded = request?.headers?.['x-forwarded-for'];
  const ip = request?.headers?.['cf-connecting-ip'] || request?.headers?.['x-real-ip'] || (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim()) || request?.ip;
  return { ip: ip ? String(ip) : undefined, userAgent: request?.headers?.['user-agent'] as string | undefined };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService, private readonly activity: UsersActivityService) {}

  @Roles('DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'RH_RS', 'FUNCIONARIO', 'GESTOR', 'CONSULTA')
  @Post('ping')
  ping(@CurrentUser() actor: JwtUser) {
    return this.service.ping(actor.sub);
  }

  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.list(companyId, actor);
  }

  /** Retorna { used, max } - consumido pela tela de Usuarios para mostrar o limite. */
  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Get('usage')
  usage(@CurrentCompany() companyId: string) {
    return this.service.usage(companyId);
  }

  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Post()
  create(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: CreateUserDto, @Req() request: any) {
    return this.service.create(companyId, actor, dto, requestMeta(request));
  }

  /** Funcionários sem usuário: candidatos a "atrelar". */
  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Get('linkable-employees')
  linkable(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Query() query: LinkableQueryDto) {
    return this.service.linkableEmployees(companyId, actor, query.search ?? '', query.companyId);
  }

  /** Registra o acesso a uma página (alimenta o histórico do usuário). */
  @Roles('DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'RH_RS', 'FUNCIONARIO', 'GESTOR', 'CONSULTA')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Post('activity/page-view')
  pageView(@CurrentUser() actor: JwtUser, @Body() dto: PageViewDto, @Req() request: any) {
    return this.activity.recordPageView(actor, dto.path, requestMeta(request));
  }
  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Get(':id')
  get(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.get(companyId, actor, id);
  }

  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Patch(':id')
  update(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: any,
  ) {
    return this.service.update(companyId, actor, id, dto, requestMeta(request));
  }

  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Delete(':id')
  delete(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Req() request: any) {
    return this.service.delete(companyId, actor, id, requestMeta(request));
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Post(':id/reset-password')
  resetPassword(
    @CurrentCompany() companyId: string, 
    @CurrentUser() actor: JwtUser, 
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
  ) {
    return this.service.resetPassword(companyId, actor, id, dto);
  }

  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Post(':id/temporary-password/reveal')
  revealTemporaryPassword(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.revealTemporaryPassword(companyId, actor, id);
  }

  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Post(':id/temporary-password/reissue')
  reissueTemporaryPassword(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.reissueTemporaryPassword(companyId, actor, id);
  }
  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Header('Cache-Control', 'no-store')
  @Get(':id/activity')
  getActivity(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Query() query: ActivityQueryDto) {
    return this.activity.activity(companyId, actor, id, query);
  }

  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get(':id/activity/pdf')
  activityPdf(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Query() query: ActivityQueryDto, @Res() res: any) {
    return this.activity.pdf(companyId, actor, id, query.days ?? 30, res);
  }

  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Put(':id/employee')
  linkEmployee(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: LinkEmployeeDto, @Req() request: any) {
    return this.service.linkEmployee(companyId, actor, id, dto.employeeId, requestMeta(request));
  }

  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Post(':id/block')
  block(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto, @Req() request: any) {
    return this.service.block(companyId, actor, id, dto.reason, requestMeta(request));
  }

  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Post(':id/unblock')
  unblock(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Req() request: any) {
    return this.service.unblock(companyId, actor, id, requestMeta(request));
  }

  @Roles('DEV', 'CEO', 'ADMIN', 'RH')
  @Post(':id/cancel')
  cancel(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto, @Req() request: any) {
    return this.service.cancel(companyId, actor, id, dto.reason, requestMeta(request));
  }

  @Roles('DEV')
  @Post(':id/mfa/reset')
  resetMfa(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Req() request: any) {
    return this.service.resetMfa(companyId, actor, id, requestMeta(request));
  }
}