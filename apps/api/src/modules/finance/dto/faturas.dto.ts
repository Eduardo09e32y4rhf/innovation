import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Length, Max, MaxLength, Min } from 'class-validator';

export class ListFaturasCompaniesDto {
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
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'CANCELLED'])
  status?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

  @IsOptional()
  @IsIn(['TRIAL', 'PENDING_PAYMENT', 'ACTIVE', 'PAST_DUE', 'CANCELED'])
  billingStatus?: 'TRIAL' | 'PENDING_PAYMENT' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
}

/** Todo ajuste financeiro exige motivo: fica no livro de ajustes e na auditoria. */
class ReasonDto {
  @IsString()
  @Length(5, 300)
  reason!: string;
}

export class DiscountInvoiceDto extends ReasonDto {
  @IsIn(['PERCENT', 'FIXED'])
  kind!: 'PERCENT' | 'FIXED';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  value!: number;
}

export class RecurringDiscountDto extends DiscountInvoiceDto {
  /** Quantos ciclos o desconto vale. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  cycles!: number;
}

export class FreeDaysDto extends ReasonDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days!: number;
}

export class PartialRefundDto extends ReasonDto {
  @IsOptional() @IsUUID() idempotencyKey?: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
}

export class FullRefundDto extends ReasonDto {
  @IsOptional() @IsUUID() idempotencyKey?: string;
}

export class ChangeSeatsDto extends ReasonDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  seatQuantity!: number;
}

export class AttachFiscalDto extends ReasonDto {
  @IsOptional() @IsString() @MaxLength(60) invoiceNumber?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2000) fiscalPdfUrl?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2000) fiscalXmlUrl?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2000) receiptUrl?: string;
}

export class CancelInvoiceDto extends ReasonDto {}

export class ChangePlanDto extends ReasonDto {
  @IsUUID()
  planId!: string;
}

export class ApplyCouponDto extends ReasonDto {
  @IsString()
  @Length(2, 60)
  code!: string;
}

export class CancelSubscriptionDto extends ReasonDto {
  @IsIn(['NOW', 'END_OF_CYCLE'])
  mode!: 'NOW' | 'END_OF_CYCLE';
}

export class CompanyChangeSeatsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  seatQuantity!: number;
}

export class CompanyChangePlanDto {
  @IsUUID()
  planId!: string;
}

export class ActivateSubscriptionDto extends ReasonDto {
  @IsUUID()
  planId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  seatQuantity!: number;

  @IsBoolean()
  chargeNow!: boolean;
}

/** Liberação manual do acesso: por confiança (fatura segue em aberto) ou porque o valor foi recebido por outro meio. */
export class ReleaseAccessDto extends ReasonDto {
  @IsIn(['TRUST', 'RECEIVED'])
  method!: 'TRUST' | 'RECEIVED';
}

/** Pedido de reembolso feito pelo cliente (abre chamado). */
export class RefundRequestDto {
  @IsString()
  @Length(10, 500)
  reason!: string;
}

/** Cancelamento da assinatura pelo administrador da empresa. */
export class CompanyCancelDto {
  @IsString()
  @Length(5, 300)
  reason!: string;
}
