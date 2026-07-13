import { IsString, IsOptional, IsDateString } from 'class-validator';

export class AssignScheduleDto {
  @IsString()
  employeeId: string;

  @IsString()
  scheduleId: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  entryTimeOverride?: string;

  @IsOptional()
  @IsString()
  lunchStartTimeOverride?: string;

  @IsOptional()
  @IsString()
  lunchReturnTimeOverride?: string;

  @IsOptional()
  @IsString()
  exitTimeOverride?: string;
}
