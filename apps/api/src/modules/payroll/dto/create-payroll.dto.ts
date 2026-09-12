import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PayrollStatus } from '@prisma/client';

export class CreatePayrollDto {
  @IsUUID()
  employeeId: string;

  @IsInt()
  @Min(1)
  @Max(12)
  referenceMonth: number;

  @IsInt()
  @Min(2020)
  referenceYear: number;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class UpdatePayrollStatusDto {
  @IsEnum(PayrollStatus)
  status: PayrollStatus;
}
