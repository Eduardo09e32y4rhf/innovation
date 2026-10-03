import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PunchDto {
  @IsOptional() @Type(() => Number) @IsLatitude() latitude?: number;
  @IsOptional() @Type(() => Number) @IsLongitude() longitude?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100000)
  accuracyMeters?: number;

  @IsOptional() @IsString() @MaxLength(300)
  justification?: string;

  @IsOptional() @IsString() @MaxLength(120)
  deviceId?: string;
}
