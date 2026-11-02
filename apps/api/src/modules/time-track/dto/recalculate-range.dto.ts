import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class RecalculateRangeDto {
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Informe o mes no formato YYYY-MM.' })
  month!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
