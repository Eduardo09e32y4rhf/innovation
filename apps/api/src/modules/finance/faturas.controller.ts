import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipSubscriptionCheck } from '../../common/decorators/skip-subscription-check.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FaturasPermissionGuard, RequireFaturasPermission } from '../../common/permissions/require-faturas-permission';
import type { JwtUser } from '../../common/types/auth.types';
import { ListPlatformInvoicesDto } from './dto/platform-finance.dto';
import { ListFaturasCompaniesDto } from './dto/faturas.dto';
import { FaturasService } from './faturas.service';
import { PlatformFinanceService } from './platform-finance.service';

/**
 * Aba Faturas. A autorização é por permissão (padrão do perfil ou personalizada), não por perfil fixo,
 * para que a tela de Permissões consiga liberar a aba a outros perfis.
 */
@UseGuards(JwtAuthGuard, FaturasPermissionGuard)
@SkipSubscriptionCheck()
@Controller('faturas')
export class FaturasController {
  constructor(
    private readonly service: PlatformFinanceService,
    private readonly faturas: FaturasService,
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
}
