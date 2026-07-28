import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { PlatformFinanceService } from './platform-finance.service';
import { ChangeCompanyPlanDto } from './dto/change-company-plan.dto';
import { ChangeSeatQuantityDto } from './dto/change-seat-quantity.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DEV')
@Controller('finance/company')
export class CompanyBillingController {
  constructor(private readonly service: PlatformFinanceService) {}

  @Get('status')
  status(@CurrentCompany() companyId: string) {
    return this.service.getCompanyBilling(companyId);
  }

  @Get('invoices')
  invoices(@CurrentCompany() companyId: string) {
    return this.service.listCompanyInvoices(companyId);
  }

  @Post('checkout')
  checkout(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.ensureCompanyOnboardingBilling(companyId, actor);
  }

  @Post('change-plan')
  changePlan(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Body() dto: ChangeCompanyPlanDto,
  ) {
    return this.service.changeCompanyPlan(companyId, dto.planId, actor);
  }

  @Post('change-seats')
  changeSeats(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Body() dto: ChangeSeatQuantityDto,
  ) {
    return this.service.changeSeatQuantity(companyId, dto.seatQuantity, actor);
  }

  @Post('refund/:id')
  @Roles('DEV')
  requestRefund(@Param('id') invoiceId: string, @CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.requestRefund(invoiceId, companyId, actor);
  }
}
