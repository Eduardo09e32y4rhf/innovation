import { AsoClinicPresetDto, AsoRecordDto } from './dto/aso.dto';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { AsoService } from './aso.service';

/** Escrita de ASO/presets (@Roles por metodo): DEV, ADMIN, RH = ROLE_ACCESS.asoManage no web; RH_RS nao tem asoWrite. */

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH', 'GESTOR', 'CEO', 'CONSULTA')
@Controller('management/aso')
export class AsoController {
  constructor(private readonly svc: AsoService) {}

  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() _actor: JwtUser) {
    return this.svc.list(companyId);
  }

  @Get('employee/:employeeId')
  listByEmployee(@CurrentCompany() companyId: string, @CurrentUser() _actor: JwtUser, @Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.svc.listByEmployee(companyId, employeeId);
  }

  @Get('alerts/rh')
  rhAlerts(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.svc.getRhAlerts(companyId, actor);
  }

  // ─── CLINIC PRESETS ──────────────────────────────────────────────────────────

  @Get('clinic-presets')
  listClinicPresets(@CurrentCompany() companyId: string, @CurrentUser() _actor: JwtUser) {
    return this.svc.listClinicPresets(companyId);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Post('clinic-presets')
  createClinicPreset(@CurrentCompany() companyId: string, @CurrentUser() _actor: JwtUser, @Body() body: AsoClinicPresetDto) {
    return this.svc.createClinicPreset(companyId, body);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Delete('clinic-presets/:id')
  deleteClinicPreset(@CurrentCompany() companyId: string, @CurrentUser() _actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteClinicPreset(companyId, id);
  }

  // ─── ASO RECORDS ─────────────────────────────────────────────────────────────

  @Get(':id')
  find(@CurrentCompany() companyId: string, @CurrentUser() _actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.find(companyId, id);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Post()
  create(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() body: AsoRecordDto) {
    return this.svc.create(companyId, actor.sub, body);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Patch(':id')
  update(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: AsoRecordDto) {
    return this.svc.update(companyId, id, actor.sub, body);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Delete(':id')
  delete(@CurrentCompany() companyId: string, @CurrentUser() _actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.delete(companyId, id);
  }
}
