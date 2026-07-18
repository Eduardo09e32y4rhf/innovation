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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/types/auth.types';

function currentMonthInSaoPaulo() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 7);
}

@UseGuards(JwtAuthGuard)
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

  @Get('me/calendar')
  myCalendarStable(@CurrentUser() actor: JwtUser, @Query('month') month: string) {
    return this.service.getMyCalendar(actor.companyId, actor, month || currentMonthInSaoPaulo());
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

  @Get('calendar/me')
  myCalendar(@CurrentUser() actor: JwtUser, @Query('month') month: string) {
    // Resolve o employeeId do usuário logado
    const m = month || currentMonthInSaoPaulo();
    return this.service.getMyCalendar(actor.companyId, actor, m);
  }

  @Get(':id')
  getOne(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.getSchedule(actor.companyId, id);
  }

  @Post()
  create(@CurrentUser() actor: JwtUser, @Body() dto: CreateScheduleDto) {
    return this.service.createSchedule(actor.companyId, actor, dto);
  }

  @Patch(':id')
  update(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: Partial<CreateScheduleDto>) {
    return this.service.updateSchedule(actor.companyId, actor, id, dto);
  }

  @Patch(':id/archive')
  archive(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.archiveSchedule(actor.companyId, actor, id);
  }

  // ─── Atribuição ─────────────────────────────────────────────────

  @Post('assign')
  assign(@CurrentUser() actor: JwtUser, @Body() dto: AssignScheduleDto) {
    return this.service.assignSchedule(actor.companyId, actor, dto);
  }

  // ─── Exceções ───────────────────────────────────────────────────

  @Post('exceptions')
  createException(@CurrentUser() actor: JwtUser, @Body() dto: CreateScheduleExceptionDto) {
    return this.service.createException(actor.companyId, actor, dto);
  }

  @Delete('exceptions/:id')
  deleteException(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.deleteException(actor.companyId, actor, id);
  }
}
