import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateCommercialSaleDto {
  @IsUUID()
  companyId!: string;

  @IsUUID()
  sellerId!: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsString()
  cycle?: string;

  @IsNumber()
  @Min(0)
  contractValue!: number;

  @IsOptional()
  @IsBoolean()
  recurrence?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage!: number;

  @IsString()
  idempotencyKey!: string;

  @IsOptional()
  snapshot?: Record<string, unknown>;
}
