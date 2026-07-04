import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RateLimitGuard, RateLimit } from '../../common/guards/rate-limit.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { ManualTimeTrackDto } from './dto/manual-time-track.dto';
import { RegisterTimeDto } from './dto/register-time.dto';
import { RevokeTimeTrackDto } from './dto/revoke-time-track.dto';
import { UpdateTimeTrackDto } from './dto/update-time-track.dto';
import { TimeTrackService } from './time-track.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA')
@Controller('time-track')
export class TimeTrackController {
  constructor(private readonly service: TimeTrackService) {}

  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Query('month') month?: string) {
    return this.service.list(companyId, actor, month);
  }

  @Get(':employeeId/month')
  listEmployeeMonth(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('employeeId') employeeId: string, @Query('month') month?: string) {
    return this.service.listEmployeeMonth(companyId, actor, employeeId, month);
  }

  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO')
  @Post('manual')
  manual(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: ManualTimeTrackDto) {
    return this.service.manual(companyId, actor, dto);
  }



  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO')
  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit({ window: 60, max: 20, prefix: 'punch' }) // 20 punches per minute per user/IP
  register(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: RegisterTimeDto) {
    return this.service.register(companyId, actor, dto);
  }

  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR')
  @Get('pending')
  listPending(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.listPending(companyId, actor);
  }

  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR')

  @Patch(':id/overtime-approval')
  approveOvertime(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() body: { approved: boolean }) {
    return this.service.approveOvertime(companyId, actor, id, body.approved);
  }

  @Patch(':id/approve')
  approve(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() body: { approved: boolean }) {
    return this.service.approveManual(companyId, actor, id, body.approved);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Patch(':id')
  update(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateTimeTrackDto) {
    return this.service.update(companyId, id, dto);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Patch(':id/revoke')
  revoke(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: RevokeTimeTrackDto) {
    return this.service.revokeManual(companyId, actor, id, dto.reason);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Delete(':id')
  delete(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.delete(companyId, id);
  }
}
