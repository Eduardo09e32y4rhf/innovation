import { PromotionPolicyDto } from './dto/promotion-policy.dto';
import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { PromotionsService, type PromotionDto } from './promotions.service';

/** Promoções: RH, Administrador e Dev lançam; CEO consulta. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH', 'CEO')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

  private assertWriter(actor: JwtUser) {
    if (!['DEV', 'ADMIN', 'RH'].includes(actor.role)) throw new ForbiddenException('Seu perfil só consulta as promoções.');
  }

  @Get('policy')
  policy(@CurrentCompany() companyId: string) { return this.service.getPolicy(companyId); }

  @Put('policy')
  savePolicy(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() body: PromotionPolicyDto) { this.assertWriter(actor); return this.service.savePolicy(companyId, actor, body); }

  @Get()
  list(@CurrentCompany() companyId: string, @Query('status') status?: string) { return this.service.list(companyId, status); }

  @Post()
  create(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: PromotionDto) { this.assertWriter(actor); return this.service.create(companyId, actor, dto); }

  @Post(':id/cancel')
  cancel(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) { this.assertWriter(actor); return this.service.cancel(companyId, actor, id); }
}
