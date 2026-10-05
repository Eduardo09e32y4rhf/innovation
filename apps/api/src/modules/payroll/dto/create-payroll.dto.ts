import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Length, MaxLength, Min, ValidateNested } from 'class-validator';

export const MANUAL_ITEM_TYPES = ['BONUS', 'COMMISSION', 'OTHER_EARNING', 'ADVANCE', 'OTHER_DEDUCTION'] as const;
export const DEDUCTION_TYPES = ['ADVANCE', 'OTHER_DEDUCTION'];

/** Lançamento manual do RH: provento (bônus, comissão, outro) ou desconto (adiantamento, outro). */
export class ManualPayrollItemDto {
  @IsIn(MANUAL_ITEM_TYPES)
  type!: (typeof MANUAL_ITEM_TYPES)[number];

  @IsString()
  @Length(2, 120)
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
}

export class CreatePayrollDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  employeeIds!: string[];

  /** Início do ciclo (YYYY-MM-DD). */
  @IsDateString()
  periodStart!: string;

  /** Fim do ciclo (YYYY-MM-DD). */
  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observations?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ManualPayrollItemDto)
  items?: ManualPayrollItemDto[];
}

export class UpdatePayrollDto {
  @IsOptional() @IsDateString()
  periodStart?: string;

  @IsOptional() @IsDateString()
  periodEnd?: string;

  @IsOptional() @IsString() @MaxLength(500)
  observations?: string;

  /** Quando enviado, substitui todos os lançamentos manuais. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ManualPayrollItemDto)
  items?: ManualPayrollItemDto[];
}

export class CancelPayrollDto {
  @IsString()
  @Length(5, 300)
  reason!: string;
}