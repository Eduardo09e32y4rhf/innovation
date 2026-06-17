import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateTimeTrackDto {
  @IsOptional()
  @IsDateString()
  entry?: string;

  @IsOptional()
  @IsDateString()
  lunchStart?: string;

  @IsOptional()
  @IsDateString()
  lunchReturn?: string;

  @IsOptional()
  @IsDateString()
  exit?: string;

  @IsOptional()
  @IsString()
  observation?: string;
}
