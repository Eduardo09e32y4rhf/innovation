import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { PromotionPolicyDto } from './dto/promotion-policy.dto';
import { Body, Controller, ForbiddenException, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { PromotionDto } from './dto/promotion.dto';
import { PromotionsService } from './promotions.service';

/** Promoções: RH, Administrador e Dev lançam; CEO consulta. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH', 'CEO')
@Controller('promotions')
@RequiresFeature('promotions')
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

  /** Aplica agora as promocoes agendadas ja vencidas desta empresa (antes isso acontecia dentro do GET). */
  @Post('apply-due')
  @HttpCode(200)
  async applyDueNow(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) { this.assertWriter(actor); return { applied: await this.service.applyDue(companyId) }; }

  @HttpCode(200)
  @Post(':id/cancel')
  cancel(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) { this.assertWriter(actor); return this.service.cancel(companyId, actor, id); }
}
