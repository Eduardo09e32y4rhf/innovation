import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CommissionTransitionDto {
  @IsOptional() @IsString() @MaxLength(200) paymentReference?: string;
}
