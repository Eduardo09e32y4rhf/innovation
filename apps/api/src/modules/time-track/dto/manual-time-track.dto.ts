import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export const TIME_TRACK_ADJUSTMENT_REASONS = [
  'ajuste_abono_atestado_horas',
  'ajuste_atestado_integral',
  'ajuste_folga_dsr',
  'ajuste_abono_folga',
  'ajuste_erro_marcacao',
  'ajuste_feriado',
] as const;

export class ManualTimeTrackDto {
  @IsUUID()
  employeeId!: string;

  @IsDateString()
  date!: string;

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

  @IsIn(TIME_TRACK_ADJUSTMENT_REASONS)
  reason!: (typeof TIME_TRACK_ADJUSTMENT_REASONS)[number];

  @IsOptional()
  @IsString()
  observation?: string;
}

export class BulkManualTimeTrackDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @IsUUID(undefined, { each: true })
  employeeIds!: string[];

  @ValidateIf((dto) => !dto.startDate && !dto.endDate)
  @IsDateString()
  date?: string;

  @ValidateIf((dto) => !dto.date)
  @IsDateString()
  startDate?: string;

  @ValidateIf((dto) => !dto.date)
  @IsDateString()
  endDate?: string;

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

  @IsIn(TIME_TRACK_ADJUSTMENT_REASONS)
  reason!: (typeof TIME_TRACK_ADJUSTMENT_REASONS)[number];

  @IsOptional()
  @IsString()
  observation?: string;
}