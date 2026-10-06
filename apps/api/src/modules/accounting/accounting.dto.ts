import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

export const RULE_TYPES = ['INSS', 'IRRF', 'FGTS', 'PAYROLL_PARAMS'] as const;
export type RuleType = (typeof RULE_TYPES)[number];

export class BracketDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) limit?: number | null;
  @Type(() => Number) @IsNumber() @Min(0) @Max(1) rate!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) deduction?: number;
}

export class SaveRuleDto {
  @IsIn(RULE_TYPES as unknown as string[]) taxType!: RuleType;
  @IsOptional() @IsString() @MaxLength(40) version?: string;
  @IsDateString() effectiveFrom!: string;

  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => BracketDto)
  brackets?: BracketDto[];

  @IsOptional() @IsObject()
  parameters?: Record<string, number>;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.001) @Max(0.5)
  rate?: number;
}

export class SimulateDto {
  @Type(() => Number) @IsNumber() @Min(0) @Max(1_000_000) salary!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20) dependents?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20000) overtime50Minutes?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20000) overtime100Minutes?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20000) nightShiftMinutes?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20000) absenceMinutes?: number;
  @IsOptional() @IsDateString() referenceDate?: string;
}

export class MonthQueryDto {
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Mes invalido. Use AAAA-MM.' }) month?: string;
  @IsOptional() @IsUUID() companyId?: string;
}

export class CorrectPayrollDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(10_000_000) baseSalary?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(10_000_000) overtimeAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(10_000_000) nightShiftAmount?: number;
  @IsString() @MaxLength(500) reason!: string;
}

export const CLOSING_FIELDS = ['salaryBase', 'overtime50', 'overtime100', 'nightShift', 'absenceMinutes', 'lateMinutes', 'earlyLeaveMinutes'] as const;

export class AdjustClosingDto {
  @IsIn(CLOSING_FIELDS as unknown as string[]) field!: (typeof CLOSING_FIELDS)[number];
  @Type(() => Number) @IsNumber() @Min(0) @Max(10_000_000) newValue!: number;
  @IsString() @MaxLength(500) reason!: string;
}

export class RecalculateClosingsDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Mes invalido. Use AAAA-MM.' }) month!: string;
  @IsUUID() companyId!: string;
}

export class WorkflowDto {
  @IsIn(['REVIEW', 'APPROVE', 'RETURN']) action!: 'REVIEW' | 'APPROVE' | 'RETURN';
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
