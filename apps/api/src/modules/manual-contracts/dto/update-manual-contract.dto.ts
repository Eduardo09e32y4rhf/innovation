import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { MANUAL_CONTRACT_STATUSES, ManualContractStatus } from '../manual-contract-status';

export class UpdateManualContractDto {
  @IsOptional() @IsUUID() planId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000) seatQuantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) agreedAmount?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsIn(['ASAAS', 'BANK_TRANSFER', 'EXTERNAL']) paymentMethod?: 'ASAAS' | 'BANK_TRANSFER' | 'EXTERNAL';
  @IsOptional() @IsString() externalContractNumber?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() documentUrl?: string;
  @IsOptional() @IsIn(MANUAL_CONTRACT_STATUSES) status?: ManualContractStatus;
}
