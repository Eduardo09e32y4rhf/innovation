import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlatformFinanceService } from './platform-finance.service';

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
}