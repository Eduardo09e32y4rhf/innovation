import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IsMoneyLike } from '../../../common/validators/money-like';

export class PromotionDto {
  @IsUUID() employeeId!: string;
  @IsOptional() @IsString() @MaxLength(200) newPosition?: string;
  @IsOptional() @IsMoneyLike() newSalary?: number | string;
  @IsDateString() @IsNotEmpty() effectiveDate!: string;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}
