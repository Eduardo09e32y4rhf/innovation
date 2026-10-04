import { PlainJsonInterceptor } from '../../common/interceptors/plain-json.interceptor';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipSubscriptionCheck } from '../../common/decorators/skip-subscription-check.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FaturasPermissionGuard, RequireFaturasPermission } from '../../common/permissions/require-faturas-permission';
import type { JwtUser } from '../../common/types/auth.types';
import { ListPlatformInvoicesDto } from './dto/platform-finance.dto';
import { ActivateSubscriptionDto, ApplyCouponDto, CompanyChangePlanDto, CompanyChangeSeatsDto, AttachFiscalDto, CancelSubscriptionDto, CancelInvoiceDto, ChangePlanDto, ChangeSeatsDto, DiscountInvoiceDto, FreeDaysDto, FullRefundDto, ListFaturasCompaniesDto, PartialRefundDto, RecurringDiscountDto } from './dto/faturas.dto';
import { CreatePlatformInvoiceDto } from './dto/platform-finance.dto';
import { FaturasAcoesService } from './faturas-acoes.service';
import { FaturasService } from './faturas.service';
import { PlatformFinanceService } from './platform-finance.service';

/**
 * Aba Faturas. A autorização é por permissão (padrão do perfil ou personalizada), não por perfil fixo,
 * para que a tela de Permissões consiga liberar a aba a outros perfis.
 */
@UseGuards(JwtAuthGuard, FaturasPermissionGuard)
@SkipSubscriptionCheck()
@UseInterceptors(PlainJsonInterceptor)
@Controller('faturas')
export class FaturasController {
  constructor(
    private readonly service: PlatformFinanceService,
    private readonly faturas: FaturasService,
    private readonly acoes: FaturasAcoesService,
  ) {}

  // ---- Visão da empresa ----
  @Get('empresa/status')
  @RequireFaturasPermission('faturas.ver')
  status(@CurrentCompany() companyId: string) {
    return this.service.getCompanyBilling(companyId);
  }

  @Get('empresa/invoices')
  @RequireFaturasPermission('faturas.ver')
  invoices(@CurrentCompany() companyId: string) {
    return this.service.listCompanyInvoices(companyId);
  }

  @Post('empresa/checkout')
  @RequireFaturasPermission('faturas.pagar')
  checkout(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.ensureCompanyOnboardingBilling(companyId, actor);
  }

  // ---- Visão da empresa: trocar plano e usuários (com rateio) ----
  @Get('empresa/seats/quote')
  @RequireFaturasPermission('faturas.plano')
  companySeatsQuote(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Query('seatQuantity') seatQuantity: string) {
    return this.acoes.quoteSeats(companyId, Number(seatQuantity), actor);
  }

  @Post('empresa/seats')
  @RequireFaturasPermission('faturas.plano')
  companyChangeSeats(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: CompanyChangeSeatsDto) {
    return this.acoes.changeSeats(companyId, dto.seatQuantity, 'Alterado pelo administrador da empresa', actor);
  }

  @Get('empresa/plan/quote')
  @RequireFaturasPermission('faturas.plano')
  async companyPlanQuote(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Query('planId', ParseUUIDPipe) planId: string) {
    await this.acoes.assertPublicPlan(planId);
    return this.acoes.quotePlan(companyId, planId, actor);
  }

  @Post('empresa/plan')
  @RequireFaturasPermission('faturas.plano')
  async companyChangePlan(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: CompanyChangePlanDto) {
    await this.acoes.assertPublicPlan(dto.planId);
    return this.acoes.changePlan(companyId, dto.planId, 'Alterado pelo administrador da empresa', actor);
  }

  // ---- Visão plataforma (todas as empresas) ----
  @Get('plataforma/summary')
  @RequireFaturasPermission('faturas.todas_empresas')
  summary(@CurrentUser() actor: JwtUser, @Query() query: ListPlatformInvoicesDto) {
    return this.service.summary(query, actor.role === 'COMERCIAL' ? actor.sub : undefined);
  }

  @Get('plataforma/companies')
  @RequireFaturasPermission('faturas.todas_empresas')
  companies(@CurrentUser() actor: JwtUser, @Query() query: ListFaturasCompaniesDto) {
    return this.faturas.companies(query, actor);
  }

  @Get('plataforma/invoices')
  @RequireFaturasPermission('faturas.todas_empresas')
  list(@CurrentUser() actor: JwtUser, @Query() query: ListPlatformInvoicesDto) {
    return this.service.list(query, actor.role === 'COMERCIAL' ? actor.sub : undefined);
  }

  @Get('plataforma/companies/:companyId/invoices')
  @RequireFaturasPermission('faturas.todas_empresas')
  companyInvoices(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string) {
    return this.service.listCompanyInvoices(companyId, actor.role === 'COMERCIAL' ? actor.sub : undefined);
  }

  @Get('plataforma/companies/:companyId/adjustments')
  @RequireFaturasPermission('faturas.todas_empresas')
  async adjustments(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string) {
    await this.acoes.assertCompany(actor, companyId);
    return this.acoes.listAdjustments(companyId);
  }

  // ---- Ações de dinheiro (cada uma exige motivo e grava o livro de ajustes) ----
  @Post('plataforma/invoices')
  @RequireFaturasPermission('faturas.cobrar')
  charge(@CurrentUser() actor: JwtUser, @Body() dto: CreatePlatformInvoiceDto) {
    return this.acoes.charge(dto, actor);
  }

  @Delete('plataforma/invoices/:id')
  @RequireFaturasPermission('faturas.cobrar')
  cancel(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelInvoiceDto) {
    return this.acoes.cancelInvoice(id, dto.reason, actor);
  }

  @Post('plataforma/invoices/:id/discount')
  @RequireFaturasPermission('faturas.desconto')
  discount(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DiscountInvoiceDto) {
    return this.acoes.discountInvoice(id, dto, actor);
  }

  @Post('plataforma/invoices/:id/refund-partial')
  @RequireFaturasPermission('faturas.reembolsar')
  refundPartial(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PartialRefundDto) {
    return this.acoes.partialRefund(id, dto, actor);
  }

  @Post('plataforma/invoices/:id/refund')
  @RequireFaturasPermission('faturas.reembolsar')
  refundFull(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: FullRefundDto) {
    return this.acoes.fullRefund(id, dto.reason, actor);
  }

  @Post('plataforma/invoices/:id/fiscal')
  @RequireFaturasPermission('faturas.nf_anexar')
  fiscal(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AttachFiscalDto) {
    return this.acoes.attachFiscal(id, dto, actor);
  }

  @Post('plataforma/companies/:companyId/recurring-discount')
  @RequireFaturasPermission('faturas.desconto')
  recurringDiscount(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Body() dto: RecurringDiscountDto) {
    return this.acoes.recurringDiscount(companyId, dto, actor);
  }

  @Post('plataforma/companies/:companyId/free-days')
  @RequireFaturasPermission('faturas.desconto')
  freeDays(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Body() dto: FreeDaysDto) {
    return this.acoes.freeDays(companyId, dto, actor);
  }

  @Get('plataforma/companies/:companyId/seats/quote')
  @RequireFaturasPermission('faturas.cobrar')
  quoteSeats(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Query('seatQuantity') seatQuantity: string) {
    return this.acoes.quoteSeats(companyId, Number(seatQuantity), actor);
  }

  @Post('plataforma/companies/:companyId/seats')
  @RequireFaturasPermission('faturas.cobrar')
  changeSeats(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Body() dto: ChangeSeatsDto) {
    return this.acoes.changeSeats(companyId, dto.seatQuantity, dto.reason, actor);
  }

  @Post('plataforma/companies/:companyId/billing/pause')
  @RequireFaturasPermission('faturas.cobrar')
  async pause(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string) {
    await this.acoes.assertCompany(actor, companyId);
    return this.service.pauseBilling(companyId, actor);
  }

  @Post('plataforma/companies/:companyId/billing/resume')
  @RequireFaturasPermission('faturas.cobrar')
  async resume(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string) {
    await this.acoes.assertCompany(actor, companyId);
    return this.service.resumeBilling(companyId, actor);
  }

  @Get('plataforma/companies/:companyId/plan/quote')
  @RequireFaturasPermission('faturas.cobrar')
  quotePlan(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Query('planId', ParseUUIDPipe) planId: string) {
    return this.acoes.quotePlan(companyId, planId, actor);
  }

  @Post('plataforma/companies/:companyId/plan')
  @RequireFaturasPermission('faturas.cobrar')
  changePlan(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Body() dto: ChangePlanDto) {
    return this.acoes.changePlan(companyId, dto.planId, dto.reason, actor);
  }

  @Post('plataforma/invoices/:id/sync')
  @RequireFaturasPermission('faturas.cobrar')
  sync(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.acoes.sync(id, actor);
  }

  @Get('plataforma/statements/pdf')
  @RequireFaturasPermission('faturas.todas_empresas')
  statementPdf(@CurrentUser() actor: JwtUser, @Query() query: ListPlatformInvoicesDto, @Res() res: import('express').Response) {
    return this.service.statementPdf(query, actor.role === 'COMERCIAL' ? actor.sub : undefined, actor, res);
  }

  @Post('plataforma/companies/:companyId/coupon')
  @RequireFaturasPermission('faturas.desconto')
  applyCoupon(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Body() dto: ApplyCouponDto) {
    return this.acoes.applyCoupon(companyId, dto.code, dto.reason, actor);
  }

  @Post('plataforma/companies/:companyId/cancel-subscription')
  @RequireFaturasPermission('faturas.cobrar')
  cancelSubscription(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Body() dto: CancelSubscriptionDto) {
    return this.acoes.cancelSubscription(companyId, dto.mode, dto.reason, actor);
  }

  @Post('plataforma/companies/:companyId/activate-subscription')
  @RequireFaturasPermission('faturas.cobrar')
  activateSubscription(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Body() dto: ActivateSubscriptionDto) {
    return this.acoes.activateSubscription(companyId, dto, actor);
  }
}
