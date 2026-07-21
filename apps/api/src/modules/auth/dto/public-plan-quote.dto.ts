import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class PublicPlanQuoteDto {
  @IsUUID()
  planId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  seatQuantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  couponCode?: string;
}
