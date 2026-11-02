import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class RecruitmentInvoiceItemDto {
  @IsString() @MaxLength(300) description!: string;
  @IsOptional() @IsUUID() jobId?: string;
  @IsInt() @Min(1) quantity!: number;
  @IsNumber() @IsPositive() unitPrice!: number;
}

export class CreateRecruitmentInvoiceDto {
  @IsUUID() engagementId!: string;
  @IsOptional() @IsString() @MaxLength(60) invoiceNumber?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsDateString() dueDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecruitmentInvoiceItemDto)
  items!: RecruitmentInvoiceItemDto[];
}

export class DisputeInvoiceDto {
  @IsString() @MaxLength(1000) reason!: string;
}

export class RegisterPaymentDto {
  @IsOptional() @IsString() @MaxLength(40) paymentMethod?: string;
}
