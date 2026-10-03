import { applyDecorators } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const Opt = (min: number, max: number) => applyDecorators(Type(() => Number), IsInt(), Min(min), Max(max), IsOptional());

export class WorkRuleDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @Matches(HHMM) standardEntry?: string;
  @IsOptional() @Matches(HHMM) standardExit?: string;
  @Opt(0, 240) breakMinutes?: number;
  @Opt(60, 720) dailyMinutes?: number;
  @Opt(60, 3000) weeklyMinutes?: number;
  @Opt(0, 60) lateToleranceMinutes?: number;
  @Opt(0, 60) earlyLeaveToleranceMinutes?: number;
  @Opt(0, 60) overtimeToleranceMinutes?: number;
  @Opt(0, 480) maxDailyOvertimeMinutes?: number;
  @Opt(0, 6000) maxMonthlyOvertimeMinutes?: number;
  @IsOptional() @IsString() @MaxLength(20) workScale?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) restDaysOfWeek?: number[];
  @IsOptional() @IsBoolean() nightShiftEnabled?: boolean;
  @IsOptional() @Matches(HHMM) nightStartTime?: string;
  @IsOptional() @Matches(HHMM) nightEndTime?: string;
  @Opt(0, 100) nightShiftPercent?: number;
  @Opt(0, 200) normalOvertimePercent?: number;
  @Opt(0, 300) holidayOvertimePercent?: number;
  @Opt(1, 31) closingStartDay?: number;
  @Opt(1, 31) closingEndDay?: number;
  @Opt(1, 31) adjustmentDeadlineDay?: number;
  @Opt(1, 31) managerApprovalDeadlineDay?: number;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: 'ACTIVE' | 'INACTIVE';
}
