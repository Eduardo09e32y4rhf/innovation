import { ArrayMaxSize, IsArray, IsBoolean, IsDefined, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class GenerateClosingBodyDto {
  @IsOptional() @IsArray() @ArrayMaxSize(2000) @IsUUID('all', { each: true }) employeeIds?: string[];
  @IsOptional() @IsString() @MaxLength(40) periodStart?: string;
  @IsOptional() @IsString() @MaxLength(40) periodEnd?: string;
  @IsOptional() @IsInt() @Min(1) @Max(12) month?: number;
  @IsOptional() @IsInt() @Min(2000) @Max(2200) year?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) referenceMonth?: number;
  @IsOptional() @IsInt() @Min(2000) @Max(2200) referenceYear?: number;
  @IsOptional() @IsIn(['PAYMENT', 'BANK']) overtimeHandling?: 'PAYMENT' | 'BANK';
  @IsOptional() @IsBoolean() acknowledgeIssues?: boolean;
}

export class AdjustClosingDto {
  @IsString() @MaxLength(40) field!: string;
  @IsDefined() newValue!: string;
  @IsString() @MaxLength(1000) reason!: string;
}

export class OvertimePolicyDto {
  @IsOptional() @IsIn(['BANK', 'PAYMENT']) policy?: string;
  @IsOptional() @IsInt() @Min(1) @Max(12) validityMonths?: number;
}

export class ReopenClosingDto {
  @IsString() @MaxLength(1000) reason!: string;
}
