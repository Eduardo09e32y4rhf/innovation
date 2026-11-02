import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { MANUAL_ITEM_TYPES } from '../payroll/dto/create-payroll.dto';

/** Linha manual da folha (inclusão ou edição). O motivo é obrigatório e fica no histórico da linha. */
export class PayrollItemDto {
  @IsOptional() @IsIn(MANUAL_ITEM_TYPES as unknown as string[]) type?: (typeof MANUAL_ITEM_TYPES)[number];
  @IsOptional() @IsString() @Length(2, 120) description?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(10_000_000) amount?: number;
  @IsString() @Length(5, 500) reason!: string;
  /** Contabilidade assume o risco de passar do limite (35% de consignado/empréstimo, 6% de VT); a justificativa vai no motivo. */
  @IsOptional() @IsBoolean() forceLimit?: boolean;
}

export class RemoveItemQueryDto {
  @IsString() @Length(5, 500) reason!: string;
}
