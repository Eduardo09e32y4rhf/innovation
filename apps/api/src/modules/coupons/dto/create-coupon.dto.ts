import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateCouponDto {
  @IsString() @MaxLength(80) code!: string;
  @IsOptional() @IsString() @MaxLength(240) description?: string;

  /** TRIAL_DAYS (padrão), PERCENT ou FIXED. */
  @IsOptional() @IsIn(['TRIAL_DAYS', 'PERCENT', 'FIXED']) type?: 'TRIAL_DAYS' | 'PERCENT' | 'FIXED';
  /** PERCENT: 1–100. FIXED: R$ por mês. Obrigatório nos dois tipos de desconto. */
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100000) value?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(120) durationCycles?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsUUID('4', { each: true }) allowedPlanIds?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) minSeats?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) trialDays?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxRedemptions?: number;
}
