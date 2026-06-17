import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class RegisterTimeDto {
  @IsUUID()
  employeeId!: string;

  @IsIn(['ENTRY', 'LUNCH_START', 'LUNCH_RETURN', 'EXIT'])
  type!: 'ENTRY' | 'LUNCH_START' | 'LUNCH_RETURN' | 'EXIT';

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  observation?: string;
}
