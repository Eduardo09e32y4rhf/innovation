import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CancelPayrollDto, CreatePayrollDto, UpdatePayrollDto } from './dto/create-payroll.dto';
import { PayrollService } from './payroll.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH')
@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  /** Lista por ciclo (?from=YYYY-MM-DD&to=YYYY-MM-DD) ou por competência (?year=&month=). */
  @Get()
  list(
    @CurrentCompany() companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
  ) {
    return this.service.list(companyId, { from, to, year: year ? +year : undefined, month: month ? +month : undefined, status });
  }

  @Get(':id')
  get(@CurrentCompany() companyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(companyId, id);
  }

  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreatePayrollDto) {
    return this.service.create(companyId, dto);
  }

  @Patch(':id')
  update(@CurrentCompany() companyId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePayrollDto) {
    return this.service.update(companyId, id, dto);
  }

  @Post(':id/recalculate')
  recalculate(@CurrentCompany() companyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.recalculate(companyId, id);
  }

  @Patch(':id/approve')
  approve(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.approve(companyId, id, actor.sub);
  }

  @Patch(':id/reopen')
  reopen(@CurrentCompany() companyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.reopen(companyId, id);
  }

  @Patch(':id/paid')
  markPaid(@CurrentCompany() companyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.markPaid(companyId, id);
  }

  @Patch(':id/cancel')
  cancel(@CurrentCompany() companyId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelPayrollDto) {
    return this.service.cancel(companyId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentCompany() companyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.delete(companyId, id);
  }
}
