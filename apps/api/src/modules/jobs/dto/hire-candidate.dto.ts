import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

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
}
