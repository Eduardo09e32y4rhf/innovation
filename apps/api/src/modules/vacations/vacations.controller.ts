import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { UpdateVacationStatusDto } from './dto/update-vacation-status.dto';
import { VacationsService } from './vacations.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA')
@Controller('vacations')
export class VacationsController {
  constructor(private readonly service: VacationsService) {}

  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.list(companyId, actor);
  }

  @Get('employee/:employeeId')
  listByEmployee(@CurrentCompany() companyId: string, @Param('employeeId') employeeId: string) {
    return this.service.listByEmployee(companyId, employeeId);
  }

  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateVacationDto) {
    return this.service.create(companyId, dto);
  }

  @Roles('ADMIN', 'RH', 'GESTOR')
  @Patch(':id/status')
  updateStatus(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: UpdateVacationStatusDto) {
    return this.service.updateStatus(companyId, actor, id, dto);
  }
}
