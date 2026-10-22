import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { NOTICE_MODES, TERMINATION_TYPES } from '../termination.calculator';

export class TerminationParamsDto {
  @IsIn(TERMINATION_TYPES)
  type!: (typeof TERMINATION_TYPES)[number];

  @IsDateString()
  terminationDate!: string;

  @IsOptional()
  @IsIn(NOTICE_MODES)
  noticeMode?: (typeof NOTICE_MODES)[number];

  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2)
  vestedVacationPeriods?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  thirteenthAdvancePaid?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fgtsBalance?: number;

  /** Média mensal das variáveis informada manualmente (R$); substitui o cálculo automático dos últimos 12 meses. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  variableAverageOverride?: number;

  /** false desliga a média automática de variáveis (padrão: true). */
  @IsOptional()
  @IsBoolean()
  includeVariableAverage?: boolean;
}

export class SimulateTerminationDto extends TerminationParamsDto {
  @IsUUID()
  employeeId!: string;
}

export class FinalizeTerminationDto extends TerminationParamsDto {
  @IsString()
  confirm!: string;
}
