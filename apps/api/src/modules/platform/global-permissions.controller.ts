import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GlobalPermissionsService } from './global-permissions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import type { JwtUser } from '../../common/types/auth.types';

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
  update(@CurrentUser() actor: JwtUser, @Param('role') role: UserRole, @Body() body: { permissions: string[] }) {
    return this.service.update(role, body.permissions, actor);
  }
}
