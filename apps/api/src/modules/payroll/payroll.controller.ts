import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { PayrollService } from './payroll.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH')
@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get()
  list(
    @CurrentCompany() companyId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.service.list(
      companyId,
      year ? +year : undefined,
      month ? +month : undefined,
    );
  }

  @Get(':id')
  get(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.get(companyId, id);
  }

  @Post()
  calculate(
    @CurrentCompany() companyId: string,
    @Body() dto: CreatePayrollDto,
  ) {
    return this.service.calculate(companyId, dto);
  }

  @Patch(':id/approve')
  approve(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
  ) {
    return this.service.approve(companyId, id, actor.sub);
  }

  @Patch(':id/paid')
  markPaid(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.markPaid(companyId, id);
  }

  @Delete(':id')
  remove(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.delete(companyId, id);
  }
}
