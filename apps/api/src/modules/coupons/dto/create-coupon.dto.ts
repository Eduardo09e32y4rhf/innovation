import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCouponDto {
  @IsString() @MaxLength(80) code!: string;
  @IsOptional() @IsString() @MaxLength(240) description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) trialDays?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxRedemptions?: number;
}
