import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordVacationPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsIn(['PENDING', 'PAID', 'CANCELLED'])
  status?: 'PENDING' | 'PAID' | 'CANCELLED';

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
