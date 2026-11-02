import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class UpdateCouponDto {
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsOptional() @IsString() @MaxLength(240) description?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100000) value?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(120) durationCycles?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsUUID('4', { each: true }) allowedPlanIds?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) minSeats?: number | null; // null remove o minimo
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) trialDays?: number;
  @IsOptional() @IsDateString() startsAt?: string | null; // null remove o inicio
  @IsOptional() @IsDateString() expiresAt?: string | null; // null remove o fim
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxRedemptions?: number | null; // null remove o limite
}
