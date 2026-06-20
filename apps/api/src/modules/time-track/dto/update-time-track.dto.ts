import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateTimeTrackDto {
  @IsOptional()
  @IsDateString()
  entry?: string | null;

  @IsOptional()
  @IsDateString()
  lunchStart?: string | null;

  @IsOptional()
  @IsDateString()
  lunchReturn?: string | null;

  @IsOptional()
  @IsDateString()
  exit?: string | null;

  @IsOptional()
  @IsString()
  observation?: string | null;
}
