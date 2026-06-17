import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateVacationDto {
  @IsUUID()
  employeeId!: string;

  @IsString()
  @IsNotEmpty()
  acquisitionPeriod!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsInt()
  @Min(1)
  daysUsed!: number;

  @IsOptional()
  @IsString()
  observation?: string;
}
