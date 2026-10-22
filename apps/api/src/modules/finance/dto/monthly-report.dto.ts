import { IsOptional, Matches } from 'class-validator';

export class MonthlyReportQueryDto {
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Mes invalido. Use AAAA-MM.' }) month?: string;
}
