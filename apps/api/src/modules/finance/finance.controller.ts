import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreatePlatformInvoiceDto, ListPlatformInvoicesDto, UpdatePlatformInvoiceDto } from './dto/platform-finance.dto';
import { PlatformFinanceService } from './platform-finance.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'COMERCIAL')
@Controller('finance')
export class FinanceController {
  constructor(private readonly service: PlatformFinanceService) {}

  @Get('platform/summary')
  summary(@CurrentUser() actor: JwtUser, @Query() query: ListPlatformInvoicesDto) {
    return this.service.summary(query, actor.role === 'COMERCIAL' ? actor.sub : undefined);
  }

  @Get('platform/invoices')
  list(@CurrentUser() actor: JwtUser, @Query() query: ListPlatformInvoicesDto) {
    return this.service.list(query, actor.role === 'COMERCIAL' ? actor.sub : undefined);
  }

  @Get('platform/companies/:companyId/invoices')
  companyInvoices(@CurrentUser() actor: JwtUser, @Param('companyId') companyId: string) {
    return this.service.listCompanyInvoices(companyId, actor.role === 'COMERCIAL' ? actor.sub : undefined);
  }

  @Post('platform/companies/:companyId/checkout')
  @Roles('DEV')
  companyCheckout(@Param('companyId') companyId: string) {
    return this.service.ensureCompanyOnboardingBilling(companyId);
  }

  @Post('platform/invoices')
  @Roles('DEV')
  create(@Body() dto: CreatePlatformInvoiceDto) {
    return this.service.create(dto);
  }

  @Patch('platform/invoices/:id')
  @Roles('DEV')
  update(@Param('id') id: string, @Body() dto: UpdatePlatformInvoiceDto) {
    return this.service.update(id, dto);
  }

  @Post('platform/invoices/:id/sync')
  @Roles('DEV')
  sync(@Param('id') id: string) {
    return this.service.sync(id);
  }

  @Delete('platform/invoices/:id')
  @Roles('DEV')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('charge/:companyId')
  @Roles('DEV')
  createCompanyCharge(
    @Param('companyId') companyId: string,
    @Body() body: { amount: number; dueDate: string; description: string },
  ) {
    return this.service.create({
      companyId,
      amount: body.amount,
      dueDate: body.dueDate,
      description: body.description,
      billingType: 'UNDEFINED',
      sendToAsaas: true,
    });
  }
}
