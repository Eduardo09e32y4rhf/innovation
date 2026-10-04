import { PlainJsonInterceptor } from '../../common/interceptors/plain-json.interceptor';
import { Body, Controller, Delete, Get, Param, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsString } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipSubscriptionCheck } from '../../common/decorators/skip-subscription-check.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FATURAS_PERMISSIONS } from '../../common/permissions/faturas-permissions';
import { FaturasPermissionsService } from '../../common/permissions/faturas-permissions.service';
import type { JwtUser } from '../../common/types/auth.types';

class SetRolePermissionsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  permissions!: string[];
}

@UseGuards(JwtAuthGuard, RolesGuard)
@SkipSubscriptionCheck()
@UseInterceptors(PlainJsonInterceptor)
@Controller('faturas/permissoes')
export class FaturasPermissoesController {
  constructor(private readonly permissions: FaturasPermissionsService) {}

  /** Permissões efetivas do próprio usuário (o front usa para mostrar o menu e os botões). */
  @Get('minhas')
  async mine(@CurrentUser() actor: JwtUser) {
    return { permissions: await this.permissions.effective(actor) };
  }

  @Get()
  @Roles('DEV')
  async list() {
    return { catalog: FATURAS_PERMISSIONS, roles: await this.permissions.listRoles() };
  }

  @Put(':role')
  @Roles('DEV')
  set(@CurrentUser() actor: JwtUser, @Param('role') role: string, @Body() dto: SetRolePermissionsDto) {
    return this.permissions.setRole(role, dto.permissions, actor);
  }

  @Delete(':role')
  @Roles('DEV')
  reset(@CurrentUser() actor: JwtUser, @Param('role') role: string) {
    return this.permissions.resetRole(role, actor);
  }
}
