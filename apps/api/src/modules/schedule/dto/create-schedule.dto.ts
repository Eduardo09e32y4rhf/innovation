import { IsString, IsOptional, IsArray, IsBoolean, IsDateString, IsNumber, IsIn } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['5x2', '6x1', '12x36', '4x2', 'PERSONALIZADA', 'PLANTAO'])
  scaleType?: string;

  @IsOptional()
  @IsString()
  entryTime?: string;

  @IsOptional()
  @IsString()
  lunchStartTime?: string;

  @IsOptional()
  @IsString()
  lunchReturnTime?: string;

  @IsOptional()
  @IsString()
  exitTime?: string;

  @IsOptional()
  @IsArray()
  workDays?: number[];

  @IsOptional()
  @IsArray()
  restDays?: number[];

  @IsOptional()
  @IsNumber()
  cycleWorkHours?: number;

  @IsOptional()
  @IsNumber()
  cycleRestHours?: number;

  @IsOptional()
  @IsDateString()
  cycleStartDate?: string;

  @IsOptional()
  @IsBoolean()
  isNightShift?: boolean;

  @IsOptional()
  @IsString()
  nightStartTime?: string;

  @IsOptional()
  @IsString()
  nightEndTime?: string;
}
