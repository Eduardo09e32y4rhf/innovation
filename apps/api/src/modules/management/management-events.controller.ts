import { ManagementEventDto } from './dto/management-event.dto';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { ManagementEventsService } from './management-events.service';

/** Agenda (Gestão). RH - R&S usa a agenda para o proprio dia/mes e entrevistas, enxergando so os proprios compromissos. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR')
@Controller('management/events')
export class ManagementEventsController {
  constructor(private readonly svc: ManagementEventsService) {}

  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.svc.list(companyId, actor);
  }

  @Get('kanban')
  kanban(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.svc.kanban(companyId, actor);
  }

  @Get(':id')
  find(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.find(companyId, id, actor);
  }

  @Post()
  create(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() body: ManagementEventDto) {
    return this.svc.create(companyId, actor.sub, { ...body }, actor);
  }

  @Patch(':id')
  update(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: ManagementEventDto) {
    return this.svc.update(companyId, id, { ...body }, actor);
  }

  @Delete(':id')
  delete(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.delete(companyId, id, actor);
  }
}
