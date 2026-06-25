import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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

  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.svc.list(companyId, actor);
  }

  @Get('unread-count')
  unreadCount(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.svc.unreadCount(companyId, actor);
  }

  @Patch(':id/read')
  markAsRead(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.svc.markAsRead(companyId, actor.sub, id);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.svc.markAllAsRead(companyId, actor.sub);
  }

  @Patch(':id/archive')
  archive(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.svc.archive(companyId, actor.sub, id);
  }

  @Delete(':id')
  delete(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.svc.delete(companyId, actor.sub, id);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Post('admin')
  createAdminNotice(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() body: any) {
    return this.svc.createAdminNotice(companyId, actor.sub, body);
  }

  @Get('dashboard-widget')
  dashboardWidget(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.svc.dashboardWidget(companyId, actor);
  }
}