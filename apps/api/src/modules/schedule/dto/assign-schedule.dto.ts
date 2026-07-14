import { IsString, IsOptional, IsDateString, IsArray, ArrayMinSize } from 'class-validator';

export class AssignScheduleDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  employeeIds: string[];

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
