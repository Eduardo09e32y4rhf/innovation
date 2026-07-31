import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateMedicalCertificateStatusDto {
  @IsIn(['APPROVED', 'REJECTED', 'CANCELLED'])
  status!: 'APPROVED' | 'REJECTED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  reason?: string;
}
