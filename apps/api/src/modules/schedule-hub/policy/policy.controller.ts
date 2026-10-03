import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { JwtUser } from '../../../common/types/auth.types';
import { SCHEDULE_MODULE_ROLES, rolesWith } from '../../schedule/access/schedule-access';
import { GeofenceDto, PunchPolicyDto } from './policy.dto';
import { PolicyService } from './policy.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SCHEDULE_MODULE_ROLES)
@Controller('escalas')
export class PolicyController {
  constructor(private readonly service: PolicyService) {}

  @Get('policy')
  policy(@CurrentCompany() companyId: string) {
    return this.service.getPolicy(companyId);
  }

  @Roles(...rolesWith('policy.write'))
  @Put('policy')
  savePolicy(@CurrentUser() actor: JwtUser, @Body() dto: PunchPolicyDto) {
    return this.service.savePolicy(actor, dto);
  }

  @Get('geofences')
  geofences(@CurrentCompany() companyId: string) {
    return this.service.listGeofences(companyId);
  }

  @Roles(...rolesWith('policy.write'))
  @Post('geofences')
  createGeofence(@CurrentUser() actor: JwtUser, @Body() dto: GeofenceDto) {
    return this.service.createGeofence(actor, dto);
  }

  @Roles(...rolesWith('policy.write'))
  @Put('geofences/:id')
  updateGeofence(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: GeofenceDto) {
    return this.service.updateGeofence(actor, id, dto);
  }

  @Roles(...rolesWith('policy.write'))
  @Delete('geofences/:id')
  deleteGeofence(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.deleteGeofence(actor, id);
  }
}
