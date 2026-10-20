import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const CYCLES = ['MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY', 'CUSTOM'] as const;
// Dinheiro chega como numero ou texto ("29,90"); PlatformPlansService.normalizePlanPayload converte e valida.
const moneyLike = (value: unknown) => typeof value === 'number' || typeof value === 'string';
const keepMoney = Transform(({ value }) => (moneyLike(value) ? value : undefined));

export class PlanPayloadDto {
  @IsOptional() @IsString() @MaxLength(60) code?: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @keepMoney price?: number | string;
  @IsOptional() @IsIn(CYCLES) cycle?: (typeof CYCLES)[number];
  @IsOptional() @IsNumber() commitmentMonths?: number;
  @IsOptional() @keepMoney discountPercent?: number | string;
  @IsOptional() @keepMoney baseMonthlyPrice?: number | string;
  @IsOptional() @keepMoney userMonthlyPrice?: number | string;
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
