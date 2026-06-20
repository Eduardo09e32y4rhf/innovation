import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RegisterTimeDto } from './dto/register-time.dto';
import { UpdateTimeTrackDto } from './dto/update-time-track.dto';
import { TimeTrackService } from './time-track.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO')
@Controller('time-track')
export class TimeTrackController {
  constructor(private readonly service: TimeTrackService) {}

  @Get()
  list(@CurrentCompany() companyId: string) {
    return this.service.list(companyId);
  }

  @Get(':employeeId/month')
  listEmployeeMonth(@CurrentCompany() companyId: string, @Param('employeeId') employeeId: string, @Query('month') month?: string) {
    return this.service.listEmployeeMonth(companyId, employeeId, month);
  }

  @Post('register')
  register(@CurrentCompany() companyId: string, @Body() dto: RegisterTimeDto) {
    return this.service.register(companyId, dto);
  }

  @Roles('ADMIN', 'RH')
  @Patch(':id')
  update(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateTimeTrackDto) {
    return this.service.update(companyId, id, dto);
  }
}
