import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class CreateRefundRequestDto {
  @IsUUID('all', { message: 'Fatura inválida.' })
  invoiceId: string;

  @IsIn(['TOTAL', 'PARTIAL'], { message: 'Tipo de reembolso inválido.' })
  kind: 'TOTAL' | 'PARTIAL';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor inválido.' })
  @Min(0.01, { message: 'O valor deve ser maior que zero.' })
  @Max(99999999)
  amount?: number;

  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo do reembolso.' })
  @Length(5, 2000, { message: 'O motivo deve ter entre 5 e 2000 caracteres.' })
  reason: string;
}

export class RefundDecisionDto {
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  reason?: string;
}

export class RefundRejectDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo da recusa.' })
  @Length(3, 2000, { message: 'O motivo deve ter entre 3 e 2000 caracteres.' })
  reason: string;
}

export class RateTicketDto {
  @IsNumber({ maxDecimalPlaces: 0 }, { message: 'A nota deve ser um número inteiro.' })
  @Min(1, { message: 'A nota deve ser de 1 a 5.' })
  @Max(5, { message: 'A nota deve ser de 1 a 5.' })
  score: number;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  comment?: string;
}
