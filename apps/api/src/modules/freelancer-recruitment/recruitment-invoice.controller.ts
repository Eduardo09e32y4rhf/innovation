import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateRecruitmentInvoiceDto, DisputeInvoiceDto, RegisterPaymentDto } from './dto/create-recruitment-invoice.dto';
import { RecruitmentInvoiceService } from './recruitment-invoice.service';

/** Financeiro do recrutamento freelancer: SOMENTE GESTOR/ADMIN/DEV. A recrutadora (RH/RH_RS) nao acessa. */
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule('recruitment')
@Roles('DEV', 'ADMIN', 'GESTOR')
@Controller('freelancer/invoices')
export class RecruitmentInvoiceController {
  constructor(private readonly service: RecruitmentInvoiceService) {}

  @Post()
  create(@CurrentUser() actor: JwtUser, @Body() dto: CreateRecruitmentInvoiceDto) {
    return this.service.create(actor, dto);
  }

  @Get()
  list(@CurrentUser() actor: JwtUser, @Query('direction') direction?: 'issued' | 'received') {
    return this.service.list(actor, direction);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser) {
    return this.service.get(id, actor);
  }

  @Patch(':id/issue')
  issue(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser) {
    return this.service.issue(id, actor);
  }

  @Patch(':id/pay')
  pay(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser, @Body() dto: RegisterPaymentDto) {
    return this.service.registerPayment(id, actor, dto.paymentMethod);
  }

  @Patch(':id/dispute')
  dispute(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser, @Body() dto: DisputeInvoiceDto) {
    return this.service.dispute(id, actor, dto.reason);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser) {
    return this.service.cancel(id, actor);
  }
}
