import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

// kind/value/base/scope/datas sao validados por validateRule() e normalizados no payload do controller.
export class DeductionRuleDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(40) category?: string;
  @IsOptional() @IsString() @MaxLength(40) kind?: string;
  @IsOptional() value?: number | string;
  @IsOptional() @IsString() @MaxLength(40) base?: string;
  @IsOptional() @IsString() @MaxLength(40) scope?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) targets?: string[];
  @IsOptional() maxAmount?: number | string | null;
  @IsOptional() @IsString() @MaxLength(40) startDate?: string | null;
  @IsOptional() @IsString() @MaxLength(40) endDate?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
