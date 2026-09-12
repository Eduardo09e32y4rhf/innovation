import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlatformPlansService } from './plans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class BasePlanDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsNumber() discountPercent?: number;
  @IsOptional() @IsNumber() baseMonthlyPrice?: number;
  @IsOptional() @IsNumber() userMonthlyPrice?: number;
  @IsOptional() @IsBoolean() isFree?: boolean;
}

export class UpdatePlanDto extends PartialType(BasePlanDto) {}



@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'COMERCIAL')
@Controller('platform/plans')
export class PlatformPlansController {
  constructor(private readonly service: PlatformPlansService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @Roles('DEV')
  create(@Body() body: BasePlanDto) {
    return this.service.create(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @Roles('DEV')
  update(@Param('id') id: string, @Body() body: UpdatePlanDto) {
    return this.service.update(id, body);
  }

  /** Soft-delete: desativa o plano (não remove do banco) */
  @Delete(':id')
  @Roles('DEV')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  /** Hard-delete: remove permanentemente (só funciona se o plano já estiver inativo) */
  @Delete(':id/permanent')
  @Roles('DEV')
  deletePermanent(@Param('id') id: string) {
    return this.service.deletePermanent(id);
  }
}
