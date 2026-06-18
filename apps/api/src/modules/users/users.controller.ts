import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list(@CurrentCompany() companyId: string) {
    return this.service.list(companyId);
  }

  /** Retorna { used, max } — consumido pela tela de Usuarios para mostrar o limite. */
  @Get('usage')
  usage(@CurrentCompany() companyId: string) {
    return this.service.usage(companyId);
  }

  @Roles('ADMIN')
  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateUserDto) {
    return this.service.create(companyId, dto);
  }

  @Get(':id')
  get(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.get(companyId, id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  delete(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.delete(companyId, id);
  }
}
