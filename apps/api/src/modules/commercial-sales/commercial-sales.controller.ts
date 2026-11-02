import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { Body, Controller, Get, Param, ParseEnumPipe, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CommissionStatus } from '@prisma/client';
import { CommissionTransitionDto } from './dto/commission-transition.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateCommercialSaleDto } from './dto/create-commercial-sale.dto';
import { CommercialSalesService } from './commercial-sales.service';

@Controller('commercial-sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequiresFeature('commercial-sales')
export class CommercialSalesController {
  constructor(private readonly service: CommercialSalesService) {}
  @Get() @Roles('DEV', 'CEO', 'COMERCIAL') list(@CurrentUser() actor: JwtUser) { return this.service.list(actor); }
  @Post() @Roles('DEV', 'CEO', 'COMERCIAL') create(@CurrentUser() actor: JwtUser, @Body() dto: CreateCommercialSaleDto) { return this.service.create(actor, dto); }
  @Patch('commissions/:id/:status') @Roles('DEV', 'CEO') transition(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Param('status', new ParseEnumPipe(CommissionStatus)) status: CommissionStatus, @Body() body: CommissionTransitionDto) { return this.service.transitionCommission(actor, id, status, body.paymentReference); }
}
