import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const INVOICE_STATUSES = ['OPEN', 'PAID', 'OVERDUE', 'CANCELED'] as const;
export const BILLING_TYPES = ['UNDEFINED', 'PIX', 'BOLETO', 'CREDIT_CARD'] as const;

export class ListPlatformInvoicesDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsIn(INVOICE_STATUSES)
  status?: (typeof INVOICE_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreatePlatformInvoiceDto {
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsString()
  @Length(3, 180)
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsIn(BILLING_TYPES)
  billingType: (typeof BILLING_TYPES)[number] = 'UNDEFINED';

  @IsOptional()
  @IsBoolean()
  sendToAsaas = true;
}

export class UpdatePlatformInvoiceDto {
  @IsOptional()
  @IsString()
  @Length(3, 180)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsIn(BILLING_TYPES)
  billingType?: (typeof BILLING_TYPES)[number];

  @IsOptional()
  @IsIn(INVOICE_STATUSES)
  status?: (typeof INVOICE_STATUSES)[number];
}