import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlatformFinanceService } from './platform-finance.service';
import { ChangeCompanyPlanDto } from './dto/change-company-plan.dto';
import { Body } from '@nestjs/common';

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
  checkout(@CurrentCompany() companyId: string) {
    return this.service.ensureCompanyCheckout(companyId);
  }

  @Post('change-plan')
  changePlan(
    @CurrentCompany() companyId: string,
    @Body() dto: ChangeCompanyPlanDto,
  ) {
    return this.service.changeCompanyPlan(
      companyId,
      dto.planId,
    );
  }

  @Post('refund/:id')
  requestRefund(@Param('id') invoiceId: string, @CurrentCompany() companyId: string) {
    return this.service.requestRefund(invoiceId, companyId);
  }
}