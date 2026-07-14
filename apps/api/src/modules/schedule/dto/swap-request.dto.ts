import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class SwapRequestDto {
  @IsDateString()
  originalDate: string;

  @IsDateString()
  targetDate: string;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class ApproveSwapDto {
  @IsString()
  @IsIn(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class CreateScheduleExceptionDto {
  @IsString()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsIn(['FOLGA', 'FERIADO_LOCAL', 'ATESTADO', 'SUSPENSAO', 'COMPENSACAO', 'AJUSTE_ESCALA'])
  exceptionType: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  observation?: string;

  @IsOptional()
  @IsString()
  altEntryTime?: string;

  @IsOptional()
  @IsString()
  altExitTime?: string;
}
