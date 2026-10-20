import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SimulateTerminationDto } from './dto/termination.dto';
import { TerminationService } from './termination.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH')
@Controller('payroll')
export class TerminationController {
  constructor(private readonly service: TerminationService) {}

  @Post('termination/simulate')
  simulate(@CurrentCompany() companyId: string, @Body() dto: SimulateTerminationDto) {
    return this.service.simulate(companyId, dto);
  }

  @Get('thirteenth/:employeeId')
  thirteenth(
    @CurrentCompany() companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('year') year?: string,
  ) {
    const y = year ? Number(year) : new Date().getUTCFullYear();
    if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new BadRequestException('Ano inválido.');
    return this.service.thirteenth(companyId, employeeId, y);
  }
}
