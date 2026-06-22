import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class RegisterTimeDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsIn(['ENTRY', 'LUNCH_START', 'LUNCH_RETURN', 'EXIT'])
  type?: 'ENTRY' | 'LUNCH_START' | 'LUNCH_RETURN' | 'EXIT';

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  observation?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  manualReason?: string;
}
