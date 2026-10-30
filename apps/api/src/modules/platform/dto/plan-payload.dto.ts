import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsMoneyLike } from '../../../common/validators/money-like';

const CYCLES = ['MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY', 'CUSTOM'] as const;
// Dinheiro chega como numero ou texto ("29,90"); PlatformPlansService.normalizePlanPayload converte e valida.

export class PlanPayloadDto {
  @IsOptional() @IsString() @MaxLength(60) code?: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsMoneyLike() price?: number | string;
  @IsOptional() @IsIn(CYCLES) cycle?: (typeof CYCLES)[number];
  @IsOptional() @IsNumber() commitmentMonths?: number;
  @IsOptional() @IsMoneyLike() discountPercent?: number | string;
  @IsOptional() @IsMoneyLike() baseMonthlyPrice?: number | string;
  @IsOptional() @IsMoneyLike() userMonthlyPrice?: number | string;
  @IsOptional() @IsNumber() includedUnits?: number;
  @IsOptional() @IsString() @MaxLength(30) asaasCycle?: string;
  @IsOptional() @IsNumber() displayOrder?: number;
  @IsOptional() @IsBoolean() isRecommended?: boolean;
  @IsOptional() @IsNumber() pricingVersion?: number;
  @IsOptional() @IsNumber() maxUsers?: number;
  @IsOptional() @IsNumber() maxEmployees?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) activeModules?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isFree?: boolean;
  @IsOptional() @IsBoolean() isHidden?: boolean;
  @IsOptional() @IsArray() features?: unknown[];
  @IsOptional() @IsString() @MaxLength(30) extraUnitLabel?: string;
}
