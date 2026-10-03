import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { SCHEDULE_MODULE_ROLES, rolesWith } from '../schedule/access/schedule-access';
import { ScheduleScopeService } from '../schedule/access/schedule-scope.service';
import { CalendarService } from './calendar/calendar.service';
import { CreateOverrideDto, OverridesService } from './overrides/overrides.service';
import { OverviewService } from './overview/overview.service';
import { ScheduleService } from '../schedule/schedule.service';
import { AssignScheduleDto } from '../schedule/dto/assign-schedule.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SCHEDULE_MODULE_ROLES)
@Controller('escalas')
export class HubController {
  constructor(
    private readonly overview: OverviewService,
    private readonly calendar: CalendarService,
    private readonly overrides: OverridesService,
    private readonly scope: ScheduleScopeService,
    private readonly prisma: PrismaService,
    private readonly schedules: ScheduleService,
  ) {}

  @Get('overview')
  getOverview(@CurrentUser() actor: JwtUser) {
    return this.overview.overview(actor);
  }

  @Roles(...rolesWith('calendar.read'))
  @Get('calendar')
  getCalendar(@CurrentUser() actor: JwtUser, @Query('month') month: string, @Query('scope') scope = 'me', @Query('department') department?: string) {
    return this.calendar.calendar(actor, month, scope, department);
  }

  @Roles(...rolesWith('calendar.read'))
  @Get('day')
  getDay(@CurrentUser() actor: JwtUser, @Query('employeeId') employeeId: string, @Query('date') date: string) {
    return this.calendar.day(actor, employeeId, date);
  }

  @Roles(...rolesWith('calendar.read'))
  @Get('timesheet')
  async getTimesheet(@CurrentUser() actor: JwtUser, @Query('month') month: string, @Query('employeeId') employeeId?: string) {
    const target = employeeId ?? (await this.scope.employeeOf(actor))?.id;
    return this.calendar.timesheet(actor, target ?? '', month);
  }

  @Roles(...rolesWith('approvals'))
  @Get('approvals')
  approvals(@CurrentUser() actor: JwtUser) {
    return this.overview.approvals(actor);
  }

  @Roles(...rolesWith('reports.read'))
  @Get('reports')
  async reports(@CurrentUser() actor: JwtUser, @Query('month') month: string) {
    const [indicators, rows] = await Promise.all([this.overview.overview(actor).then((data: any) => data.indicators), this.overview.reportRows(actor, month)]);
    return { indicators, rows };
  }

  @Roles(...rolesWith('reports.read'))
  @Get('reports/export')
  async exportReport(@CurrentUser() actor: JwtUser, @Query('month') month: string, @Res() reply: any) {
    const csv = await this.overview.reportCsv(actor, month);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="escalas-${month}.csv"`);
    return reply.send(csv);
  }

  /** Colegas do mesmo setor (nome apenas) para trocas de turno. */
  @Roles(...rolesWith('requests.create'))
  @Get('peers')
  async peers(@CurrentUser() actor: JwtUser) {
    const me = await this.scope.employeeOf(actor);
    if (!me) return [];
    return this.prisma.employee.findMany({
      where: { companyId: actor.companyId, status: 'ACTIVE', id: { not: me.id }, ...(me.department ? { department: me.department } : {}) },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 200,
    });
  }

  /** Pessoas no escopo do usuário (pickers de lançamento). */
  @Roles(...rolesWith('schedule.write'))
  @Get('people')
  async people(@CurrentUser() actor: JwtUser) {
    const allowed = await this.scope.allowedEmployeeIds(actor, 'schedule.write');
    return this.prisma.employee.findMany({
      where: { companyId: actor.companyId, status: { in: ['ACTIVE', 'ONBOARDING'] }, ...(allowed !== null ? { id: { in: allowed } } : {}) },
      select: { id: true, name: true, department: true, position: true },
      orderBy: { name: 'asc' },
      take: 500,
    });
  }

  @Roles(...rolesWith('schedule.write'))
  @Post('overrides')
  createOverride(@CurrentUser() actor: JwtUser, @Body() dto: CreateOverrideDto) {
    return this.overrides.create(actor, dto);
  }

  @Roles(...rolesWith('schedule.write'))
  @Delete('overrides/:id')
  removeOverride(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.overrides.remove(actor, id);
  }

  /** Lançamento de escala em lote: valida o escopo (gestor só a própria equipe) e reaproveita a atribuição com bloqueios e prévia. */
  @Roles(...rolesWith('schedule.write'))
  @Post('assign/preview')
  async assignPreview(@CurrentUser() actor: JwtUser, @Body() dto: AssignScheduleDto) {
    await this.assertAssignScope(actor, dto);
    return this.schedules.previewAssignment(actor.companyId, { ...actor, role: 'ADMIN' }, dto);
  }

  @Roles(...rolesWith('schedule.write'))
  @Post('assign')
  async assign(@CurrentUser() actor: JwtUser, @Body() dto: AssignScheduleDto) {
    await this.assertAssignScope(actor, dto);
    return this.schedules.assignSchedule(actor.companyId, { ...actor, role: 'ADMIN' }, dto);
  }

  private async assertAssignScope(actor: JwtUser, dto: AssignScheduleDto) {
    for (const employeeId of dto.employeeIds) await this.scope.assertEmployee(actor, 'schedule.write', employeeId);
  }}
