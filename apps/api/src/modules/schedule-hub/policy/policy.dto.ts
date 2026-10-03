import { applyDecorators } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const Opt = (min: number, max: number) => applyDecorators(Type(() => Number), IsInt(), Min(min), Max(max), IsOptional());

export class PunchPolicyDto {
  @IsOptional() @IsBoolean() requireLocation?: boolean;
  @IsOptional() @IsIn(['BLOCK', 'FLAG', 'OFF']) fencePolicy?: 'BLOCK' | 'FLAG' | 'OFF';
  @Opt(10, 5000) maxAccuracyMeters?: number;
  @Opt(0, 3600) minIntervalSeconds?: number;
  @Opt(2, 12) maxPunchesPerDay?: number;
  @Opt(0, 720) earlyWindowMinutes?: number;
  @Opt(0, 1440) lateWindowMinutes?: number;
  @Opt(0, 60) adjustmentDeadlineDays?: number;
  @IsOptional() @IsBoolean() requireJustificationOutside?: boolean;
  @Opt(30, 1200) maxSpeedKmh?: number;
}

export class GeofenceDto {
  @IsString() @MaxLength(80) name!: string;
  @Type(() => Number) @IsLatitude() latitude!: number;
  @Type(() => Number) @IsLongitude() longitude!: number;
  @Opt(20, 5000) radiusMeters?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
