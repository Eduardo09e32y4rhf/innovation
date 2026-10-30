import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class UpdateApplicationStatusDto {
  @IsIn(['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED'])
  status!: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED';
}

export class HireCandidateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salary?: number;

  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  contractType?: string;

  @IsOptional()
  @IsUUID()
  workScheduleRuleId?: string;

  @IsOptional()
  @IsUUID()
  clinicPresetId?: string;

  /** RS-D-03: contratar com documento obrigatório pendente exige esta exceção e a justificativa (auditada). */
  @IsOptional()
  @IsBoolean()
  skipDocumentCheck?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  skipDocumentReason?: string;

  /** RS-C-13: contratar sem proposta aceita (quando houve proposta) exige exceção e justificativa. */
  @IsOptional()
  @IsBoolean()
  skipOfferCheck?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  skipOfferReason?: string;
}
