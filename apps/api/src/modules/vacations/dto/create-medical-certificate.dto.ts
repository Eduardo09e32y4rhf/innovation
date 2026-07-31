import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateMedicalCertificateDto {
  @IsUUID()
  employeeId!: string;

  @IsIn(['FULL_DAY', 'HOURS', 'DAYS'])
  certificateType!: 'FULL_DAY' | 'HOURS' | 'DAYS';

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsInt()
  @Min(1)
  coveredMinutes!: number;

  @IsDateString()
  issueDate!: string;

  @IsOptional()
  @IsString()
  issuerName?: string;

  @IsOptional()
  @IsString()
  issuerRegistration?: string;

  @IsOptional()
  @IsString()
  documentId?: string;
}
