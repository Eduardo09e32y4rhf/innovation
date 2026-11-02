import { Throttle } from '@nestjs/throttler';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipSubscriptionCheck } from '../../common/decorators/skip-subscription-check.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { PlatformFinanceService } from './platform-finance.service';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { ChangeCompanyPlanDto } from './dto/change-company-plan.dto';
import { ChangeSeatQuantityDto } from './dto/change-seat-quantity.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DEV')
@SkipSubscriptionCheck()
@Controller('finance/company')
export class CompanyBillingController {
  constructor(private readonly service: PlatformFinanceService, private readonly reconciliation: PaymentReconciliationService) {}

  @Get('status')
  status(@CurrentCompany() companyId: string) {
    return this.service.getCompanyBilling(companyId);
  }

  /**
   * Baixa por conciliação (servidor consulta o gateway) das faturas da PRÓPRIA empresa, com as mesmas regras de reativação do webhook.
   * Substitui a gravação que o GET de status fazia: GET não grava.
   */
  @Post('sync-payment')
  async syncPayment(@CurrentCompany() companyId: string) {
    const report = await this.reconciliation.reconcile({ companyId });
    return { checked: report.checked, healed: report.healed, linked: report.linked, errors: report.errors };
  }

  @Get('pix')
  pix(@CurrentCompany() companyId: string) {
    return this.service.getCompanyPix(companyId);
  }

  @Get('invoices')
  invoices(@CurrentCompany() companyId: string) {
    return this.service.listCompanyInvoices(companyId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
