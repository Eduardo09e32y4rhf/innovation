import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @Get()
  list() { return this.service.list(); }

  @Post()
  create(@Body() dto: CreateCouponDto) { return this.service.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) { return this.service.update(id, dto); }

  @Patch(':id/activate')
  activate(@Param('id') id: string) { return this.service.setActive(id, true); }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) { return this.service.setActive(id, false); }
}