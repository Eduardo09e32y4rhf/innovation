import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const ASO_TYPES = [
  'ADMISSIONAL',
  'DEMISSIONAL',
  'PERIODICO',
  'RETORNO_AO_TRABALHO',
  'MUDANCA_DE_FUNCAO',
  'COMPLEMENTAR',
] as const;

const LEGAL_NOTICE_TYPES = ['WARNING_NOTICE', 'SUSPENSION_NOTICE'] as const;

export class AsoReferralPdfDto {
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsIn(ASO_TYPES)
  asoType?: (typeof ASO_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(180)
  clinicName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  clinicAddress?: string;

  @IsOptional()
  @IsDateString()
  examDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observation?: string;
}

export class LegalNoticePdfDto {
  @IsUUID()
  employeeId!: string;

  @IsIn(LEGAL_NOTICE_TYPES)
  type!: (typeof LEGAL_NOTICE_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  legalReason?: string;

  @IsOptional()
  @IsDateString()
  occurrenceDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  suspensionDays?: number;
}
