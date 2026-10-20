import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { NOTICE_MODES, TERMINATION_TYPES } from '../termination.calculator';

export class SimulateTerminationDto {
  @IsUUID()
  employeeId!: string;

  @IsIn(TERMINATION_TYPES)
  type!: (typeof TERMINATION_TYPES)[number];

  @IsDateString()
  terminationDate!: string;

  @IsOptional()
  @IsIn(NOTICE_MODES)
  noticeMode?: (typeof NOTICE_MODES)[number];

  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2)
  vestedVacationPeriods?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  thirteenthAdvancePaid?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fgtsBalance?: number;
}
