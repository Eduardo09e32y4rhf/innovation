import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { Audited } from '../platform-audit/audited.decorator';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'CONTABIL')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @Get()
  list() { return this.service.list(); }

  @Post()
  @Audited({ action: 'COUPON_CREATED', entity: 'PromotionCoupon' })
  create(@Body() dto: CreateCouponDto, @CurrentUser() actor: JwtUser) { return this.service.create(dto, actor); }

  @Patch(':id')
  @Audited({ action: 'COUPON_UPDATED', entity: 'PromotionCoupon' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCouponDto, @CurrentUser() actor: JwtUser) { return this.service.update(id, dto, actor); }

  @Patch(':id/activate')
  @Audited({ action: 'COUPON_ACTIVATED', entity: 'PromotionCoupon' })
  activate(@Param('id', ParseUUIDPipe) id: string) { return this.service.setActive(id, true); }

  @Patch(':id/deactivate')
  @Audited({ action: 'COUPON_DEACTIVATED', entity: 'PromotionCoupon' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) { return this.service.setActive(id, false); }
}
