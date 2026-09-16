import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, Min } from 'class-validator';

export class CreatePlatformPlanDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  cycle?: 'MONTHLY' | 'YEARLY' | 'SEMIANNUALLY' | 'QUARTERLY';

  @IsOptional()
  @IsNumber()
  @Min(1)
  commitmentMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseMonthlyPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  userMonthlyPrice?: number;

  @IsOptional()
  @IsString()
  asaasCycle?: string;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isRecommended?: boolean;

  @IsOptional()
  @IsString()
  pricingVersion?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsers?: number;

  @IsOptional()
  @IsNumber()
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
