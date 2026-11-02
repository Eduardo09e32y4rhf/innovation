import { AnyAuthenticated } from '../../common/decorators/any-authenticated.decorator';
import { CreateAdminNoticeDto, RespondNotificationDto } from './dto/notification.dto';
import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @AnyAuthenticated()
  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.svc.list(companyId, actor);
  }

  @AnyAuthenticated()
  @Get('unread-count')
  unreadCount(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.svc.unreadCount(companyId, actor);
  }

  @AnyAuthenticated()
  @Patch(':id/read')
  markAsRead(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.markAsRead(companyId, actor.sub, id);
  }

  @AnyAuthenticated()
  @Patch('read-all')
  markAllAsRead(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.svc.markAllAsRead(companyId, actor.sub);
  }

  @AnyAuthenticated()
  @Patch(':id/archive')
  archive(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.archive(companyId, actor.sub, id);
  }

  @AnyAuthenticated()
  @Delete(':id')
  delete(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.delete(companyId, actor.sub, id);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Post('admin')
  createAdminNotice(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() body: CreateAdminNoticeDto) {
    // Promoção não é mais comunicado manual: lance em Gestão → Promoções (ajusta cargo e salário e avisa sozinho).
    if (body?.type === 'PROMOTION_NOTICE') throw new BadRequestException('Promoções são lançadas em Gestão → Promoções: o sistema ajusta cargo e salário e avisa o colaborador sozinho.');
    return this.svc.createAdminNotice(companyId, actor.sub, body);
  }

  @AnyAuthenticated()
  @Patch(':id/respond')
  respond(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: RespondNotificationDto) {
    return this.svc.respond(companyId, actor, id, body);
  }

  @AnyAuthenticated()
  @Get('dashboard-widget')
  dashboardWidget(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.svc.dashboardWidget(companyId, actor);
  }
}