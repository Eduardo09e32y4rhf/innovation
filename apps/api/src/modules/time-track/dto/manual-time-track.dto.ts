import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateIf } from 'class-validator';

export const REST_DAY_MODES = ['employee_scale', 'fixed_weekly', 'cycle'] as const;

export const TIME_TRACK_ADJUSTMENT_REASONS = [
  'ajuste_erro_marcacao',
  'ajuste_atestado_integral',
  'ajuste_feriado',
  'ajuste_abono_atestado_horas',
  'ajuste_folga_dsr',
  'ajuste_abono_folga',
  'ajuste_abono_banco_saida_antecipada',
  'ajuste_abono_atraso',
  'ajuste_suspensao',
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

  @IsOptional()
  @IsIn(REST_DAY_MODES)
  restDayMode?: (typeof REST_DAY_MODES)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOff?: number[];

  @IsOptional()
  @IsDateString()
  cycleStartDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  cycleWorkDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  cycleOffDays?: number;
}