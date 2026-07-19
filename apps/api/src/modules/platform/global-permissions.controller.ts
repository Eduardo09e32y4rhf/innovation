import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { GlobalPermissionsService } from './global-permissions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { $Enums } from '@prisma/client';
const UserRole = $Enums.UserRole;
type UserRole = $Enums.UserRole;

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV')
@Controller('platform/global-permissions')
export class GlobalPermissionsController {
  constructor(private readonly service: GlobalPermissionsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Patch(':role')
  update(@Param('role') role: UserRole, @Body() body: { permissions: string[] }) {
    return this.service.update(role, body.permissions);
  }
}
