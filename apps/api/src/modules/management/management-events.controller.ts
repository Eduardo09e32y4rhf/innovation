import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { ManagementEventsService } from './management-events.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH', 'GESTOR')
@Controller('management/events')
export class ManagementEventsController {
  constructor(private readonly svc: ManagementEventsService) {}

  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() _actor: JwtUser) {
    return this.svc.list(companyId);
  }

  @Get('kanban')
  kanban(@CurrentCompany() companyId: string, @CurrentUser() _actor: JwtUser) {
    return this.svc.kanban(companyId);
  }

  @Get(':id')
  find(@CurrentCompany() companyId: string, @CurrentUser() _actor: JwtUser, @Param('id') id: string) {
    return this.svc.find(companyId, id);
  }

  @Post()
  create(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() body: any) {
    return this.svc.create(companyId, actor.sub, body);
  }

  @Patch(':id')
  update(@CurrentCompany() companyId: string, @CurrentUser() _actor: JwtUser, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(companyId, id, body);
  }

  @Delete(':id')
  delete(@CurrentCompany() companyId: string, @CurrentUser() _actor: JwtUser, @Param('id') id: string) {
    return this.svc.delete(companyId, id);
  }
}