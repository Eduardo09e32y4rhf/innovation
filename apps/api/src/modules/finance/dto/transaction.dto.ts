import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsIn(['REVENUE', 'EXPENSE'])
  type!: 'REVENUE' | 'EXPENSE';

  @IsOptional()
  @IsIn(['PENDING', 'PAID', 'CANCELED'])
  status?: 'PENDING' | 'PAID' | 'CANCELED';

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsIn(['REVENUE', 'EXPENSE'])
  type?: 'REVENUE' | 'EXPENSE';

  @IsOptional()
  @IsIn(['PENDING', 'PAID', 'CANCELED'])
  status?: 'PENDING' | 'PAID' | 'CANCELED';

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
