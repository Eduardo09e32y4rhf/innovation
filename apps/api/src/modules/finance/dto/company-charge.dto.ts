import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CompanyChargeDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() amount!: number;
  @IsDateString() dueDate!: string;
  @IsString() @MaxLength(500) description!: string;
  @IsOptional() @IsString() @MaxLength(128) idempotencyKey?: string;
}
