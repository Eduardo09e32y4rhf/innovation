import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Roles('ADMIN', 'RH')
  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.list(companyId, actor);
  }

  /** Retorna { used, max } - consumido pela tela de Usuarios para mostrar o limite. */
  @Roles('ADMIN', 'RH')
  @Get('usage')
  usage(@CurrentCompany() companyId: string) {
    return this.service.usage(companyId);
  }

  @Roles('ADMIN', 'RH')
  @Post()
  create(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: CreateUserDto) {
    return this.service.create(companyId, actor, dto);
  }

  @Roles('ADMIN', 'RH')
  @Get(':id')
  get(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.get(companyId, actor, id);
  }

  @Roles('ADMIN', 'RH')
  @Patch(':id')
  update(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.update(companyId, actor, id, dto);
  }

  @Roles('ADMIN', 'RH')
  @Delete(':id')
  delete(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.delete(companyId, actor, id);
  }
}
