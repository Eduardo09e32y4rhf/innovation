import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RH', 'GESTOR', 'FUNCIONÁRIO', 'CONSULTA')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.list(companyId, actor);
  }

  @Get(':id')
  get(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.get(companyId, id);
  }

  @Roles('ADMIN', 'RH')
  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateEmployeeDto) {
    return this.service.create(companyId, dto);
  }

  @Roles('ADMIN', 'RH')
  @Patch(':id')
  update(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(companyId, id, dto);
  }

  @Roles('ADMIN', 'RH')
  @Delete(':id/permanent')
  delete(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.delete(companyId, id);
  }

  @Roles('ADMIN', 'RH')
  @Delete(':id')
  terminate(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.terminate(companyId, id);
  }
}
