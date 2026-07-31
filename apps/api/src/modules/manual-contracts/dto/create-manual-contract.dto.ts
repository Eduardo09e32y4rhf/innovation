import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { MANUAL_CONTRACT_STATUSES, ManualContractStatus } from '../manual-contract-status';

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
  @IsString()
  documentUrl?: string;

  @IsOptional()
  @IsIn(MANUAL_CONTRACT_STATUSES)
  status?: ManualContractStatus;
}
