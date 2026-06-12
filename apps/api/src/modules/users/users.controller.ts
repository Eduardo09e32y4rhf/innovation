import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiBearerAuth()
@ApiTags('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list(@CurrentCompany() companyId: string) {
    return this.service.list(companyId);
  }

  @Post()
  @Roles('ADMIN')
  create(@CurrentCompany() companyId: string, @Body() dto: CreateUserDto) {
    return this.service.create(companyId, dto);
  }

  @Get(':id')
  get(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.get(companyId, id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  delete(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.delete(companyId, id);
  }
}
