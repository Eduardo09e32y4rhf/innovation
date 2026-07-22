import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Max, Min } from 'class-validator';

export class CreateManualContractDto {
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  seatQuantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  agreedAmount!: number;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsIn(['ASAAS', 'BANK_TRANSFER', 'EXTERNAL'])
  paymentMethod!: 'ASAAS' | 'BANK_TRANSFER' | 'EXTERNAL';

  @IsOptional()
  @IsString()
  externalContractNumber?: string;

  @IsString()
  @IsNotEmpty()
  notes!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  documentUrl?: string;
}
