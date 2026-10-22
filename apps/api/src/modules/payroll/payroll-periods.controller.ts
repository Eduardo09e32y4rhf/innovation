import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { AccountingPeriodService } from './accounting-period.service';

export class ReturnPeriodDto {
  @IsString() @MaxLength(1000)
  comment!: string;
}

/** RH/ADMIN da empresa: recebem a competência publicada pela contabilidade, devolvem, liberam os holerites e registram o pagamento. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH')
@Controller('payroll/periods')
export class PayrollPeriodsController {
  constructor(private readonly periods: AccountingPeriodService) {}

  @Get(':month')
  get(@CurrentCompany() companyId: string, @Param('month') month: string) {
    return this.periods.viewForCompany(companyId, month);
  }

  @Post(':month/return')
  giveBack(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('month') month: string, @Body() dto: ReturnPeriodDto) {
    return this.periods.returnToAccountant(actor, companyId, month, dto.comment);
  }

  @Post(':month/release')
  release(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('month') month: string) {
    return this.periods.release(actor, companyId, month);
  }

  @Post(':month/paid')
  paid(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('month') month: string) {
    return this.periods.markPaid(actor, companyId, month);
  }
}
