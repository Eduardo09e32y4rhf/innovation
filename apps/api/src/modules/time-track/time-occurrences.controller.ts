import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { rolesWith } from '../schedule/access/schedule-access';
import { CreateOccurrenceDto } from './dto/occurrence.dto';
import { TimeOccurrencesService } from './time-occurrences.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('time-occurrences')
export class TimeOccurrencesController {
  constructor(private readonly svc: TimeOccurrencesService) {}

  @Roles(...rolesWith('calendar.read'))
  @Get()
  list(@CurrentUser() actor: JwtUser) {
    return this.svc.list(actor);
  }

  @Roles(...rolesWith('calendar.read'))
  @Get('employee/:employeeId')
  listByEmployee(@CurrentUser() actor: JwtUser, @Param('employeeId') employeeId: string) {
    return this.svc.list(actor, employeeId);
  }

  @Roles(...rolesWith('calendar.read'))
  @Get(':id')
  getById(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.svc.getById(actor, id);
  }

  @Roles(...rolesWith('schedule.write'))
  @Post()
  create(@CurrentUser() actor: JwtUser, @Body() dto: CreateOccurrenceDto) {
    return this.svc.create(actor, dto);
  }

  @Roles(...rolesWith('approvals'))
  @Put(':id/approve')
  approve(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.svc.approve(actor, id);
  }

  @Roles(...rolesWith('approvals'))
  @Put(':id/reject')
  reject(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.svc.reject(actor, id);
  }
}
