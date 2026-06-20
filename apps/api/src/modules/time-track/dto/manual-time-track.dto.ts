import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

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
