import { IsIn, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  candidateId!: string;

  @IsString()
  jobId!: string;
}

export class UpdateApplicationStatusDto {
  @IsIn(['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'])
  status!: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
}
