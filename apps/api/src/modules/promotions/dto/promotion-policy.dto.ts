import { ArrayMaxSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

// Limites e coerencia sao validados por validatePolicy() em PromotionsService.savePolicy.
export class PromotionPolicyDto {
  @IsOptional() @IsNumber() minMonthsInRole?: number;
  @IsOptional() maxRaisePercent?: number | null;
  @IsOptional() @IsBoolean() requireReason?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) positions?: string[];
  @IsOptional() @IsBoolean() autoNotify?: boolean;
}
