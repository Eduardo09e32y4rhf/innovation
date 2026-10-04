import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator';

export class CompleteAsoDto {
  @IsISO8601() examDate!: string;
  @IsIn(['APTO', 'INAPTO']) result!: 'APTO' | 'INAPTO';
  @IsOptional() @IsString() @MaxLength(160) clinicName?: string;
  @IsOptional() @IsString() @MaxLength(160) doctorName?: string;
  @IsOptional() @IsString() @MaxLength(60) documentNumber?: string;
  @IsOptional() @IsString() @MaxLength(2000) observation?: string;
  @IsOptional() @IsString() @MaxLength(2000) restrictions?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(6) @Max(24) periodicityMonths?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(80, { each: true }) examsPerformed?: string[];
}

export class ComplianceQueryDto {
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(100) pageSize?: number;
}
