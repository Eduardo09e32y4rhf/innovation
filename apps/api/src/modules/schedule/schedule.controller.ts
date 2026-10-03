import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { AssignScheduleDto } from './dto/assign-schedule.dto';
import { CreateScheduleExceptionDto } from './dto/swap-request.dto';
import { UpdateScheduleCoverageConfigDto } from './dto/schedule-governance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { rolesWith } from './access/schedule-access';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/types/auth.types';

function currentMonthInSaoPaulo() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 7);
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesWith('calendar.read'))
@Controller('schedules')
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  // ─── Templates de Escala ────────────────────────────────────────

  @Get()
  list(@CurrentUser() actor: JwtUser) {
    return this.service.listSchedules(actor.companyId);
  }

  @Get('my')
  mySchedule(@CurrentUser() actor: JwtUser) {
    return this.service.getMySchedule(actor.companyId, actor);
  }

  @Get('team')
  teamSchedule(@CurrentUser() actor: JwtUser, @Query('month') month: string) {
    const m = month || currentMonthInSaoPaulo();
    return this.service.getTeamSchedule(actor.companyId, actor, m);
  }

  @Get('calendar/me')
  myCalendar(@CurrentUser() actor: JwtUser, @Query('month') month: string) {
    const m = month || currentMonthInSaoPaulo();
    return this.service.getMyCalendar(actor.companyId, actor, m);
  }

  @Get('calendar/:employeeId')
  calendar(
    @CurrentUser() actor: JwtUser,
    @Param('employeeId') employeeId: string,
    @Query('month') month: string,
  ) {
    const m = month || currentMonthInSaoPaulo();
    return this.service.getCalendar(actor.companyId, actor, employeeId, m);
  }

  @Roles(...rolesWith('policy.write'))
  @Post()
  create(@CurrentUser() actor: JwtUser, @Body() dto: CreateScheduleDto) {
    return this.service.createSchedule(actor.companyId, actor, dto);
  }

  @Roles(...rolesWith('policy.write'))
  @Patch(':id')
  update(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: Partial<CreateScheduleDto>) {
    return this.service.updateSchedule(actor.companyId, actor, id, dto);
  }

  @Roles(...rolesWith('policy.write'))
  @Patch(':id/archive')
  archive(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.archiveSchedule(actor.companyId, actor, id);
  }

  // ─── Atribuição ─────────────────────────────────────────────────

  @Roles(...rolesWith('schedule.write'))
  @Post('assign')
  assign(@CurrentUser() actor: JwtUser, @Body() dto: AssignScheduleDto) {
    return this.service.assignSchedule(actor.companyId, actor, dto);
  }

  @Roles(...rolesWith('schedule.write'))
  @Post('assign/preview')
  previewAssignment(@CurrentUser() actor: JwtUser, @Body() dto: AssignScheduleDto) {
    return this.service.previewAssignment(actor.companyId, actor, dto);
  }

  @Roles(...rolesWith('schedule.write'))
  @Get('governance/history')
  history(
    @CurrentUser() actor: JwtUser,
    @Query('employeeId') employeeId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.history(actor.companyId, actor, employeeId, limit);
  }

  @Roles(...rolesWith('schedule.write'))
  @Get('governance/coverage')
  coverageConfig(@CurrentUser() actor: JwtUser) {
    return this.service.getCoverageConfig(actor.companyId, actor);
  }

  @Roles(...rolesWith('schedule.write'))
  @Post('governance/coverage')
  updateCoverageConfig(
    @CurrentUser() actor: JwtUser,
    @Body() dto: UpdateScheduleCoverageConfigDto,
  ) {
    return this.service.updateCoverageConfig(actor.companyId, actor, dto);
  }

  @Get(':id')
  getOne(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.getSchedule(actor.companyId, id);
  }

  // ─── Exceções ───────────────────────────────────────────────────

  @Roles(...rolesWith('schedule.write'))
  @Post('exceptions')
  createException(@CurrentUser() actor: JwtUser, @Body() dto: CreateScheduleExceptionDto) {
    return this.service.createException(actor.companyId, actor, dto);
  }

  @Roles(...rolesWith('schedule.write'))
  @Delete('exceptions/:id')
  deleteException(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.deleteException(actor.companyId, actor, id);
  }
}
