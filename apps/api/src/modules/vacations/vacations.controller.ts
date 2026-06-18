import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { UpdateVacationStatusDto } from './dto/update-vacation-status.dto';
import { VacationsService } from './vacations.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vacations')
export class VacationsController {
  constructor(private readonly service: VacationsService) {}

  @Get()
  list(@CurrentCompany() companyId: string) {
    return this.service.list(companyId);
  }

  @Get('employee/:employeeId')
  listByEmployee(@CurrentCompany() companyId: string, @Param('employeeId') employeeId: string) {
    return this.service.listByEmployee(companyId, employeeId);
  }

  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateVacationDto) {
    return this.service.create(companyId, dto);
  }

  @Roles('ADMIN', 'RH')
  @Patch(':id/status')
  updateStatus(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateVacationStatusDto) {
    return this.service.updateStatus(companyId, id, dto);
  }
}
