import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsArray, IsNumber, Min, ValidateIf } from 'class-validator';

export class CreatePlatformPlanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateIf(o => typeof o.price === 'string')
  @IsString()
  @ValidateIf(o => typeof o.price === 'number')
  @IsNumber()
  price?: number | string;

  @IsOptional()
  @IsString()
  cycle?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  commitmentMonths?: number;

  @IsOptional()
  @ValidateIf(o => typeof o.discountPercent === 'string')
  @IsString()
  @ValidateIf(o => typeof o.discountPercent === 'number')
  @IsNumber()
  discountPercent?: number | string;

  @IsOptional()
  @ValidateIf(o => typeof o.baseMonthlyPrice === 'string')
  @IsString()
  @ValidateIf(o => typeof o.baseMonthlyPrice === 'number')
  @IsNumber()
  baseMonthlyPrice?: number | string;

  @IsOptional()
  @ValidateIf(o => typeof o.userMonthlyPrice === 'string')
  @IsString()
  @ValidateIf(o => typeof o.userMonthlyPrice === 'number')
  @IsNumber()
  userMonthlyPrice?: number | string;

  @IsOptional()
  @IsString()
  asaasCycle?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isRecommended?: boolean;

  @IsOptional()
  @IsString()
  pricingVersion?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxEmployees?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activeModules?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}
