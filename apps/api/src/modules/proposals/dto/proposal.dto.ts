import { ArrayMaxSize, IsArray, IsDateString, IsEmail, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProposalDto {
  @IsUUID() companyId!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsString() @IsNotEmpty() @MaxLength(60) planType!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) monthlyPrice!: number;
  @Type(() => Number) @IsInt() @Min(1) usersLimit!: number;
  @Type(() => Number) @IsInt() @Min(1) employeesLimit!: number;
  @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) features!: string[];
}

export class AcceptTermsDto {
  @IsString() @IsNotEmpty() @MaxLength(200) signedByName!: string;
  @IsEmail() signedByEmail!: string;
  @IsOptional() @IsString() @MaxLength(2_000_000) signatureBase64?: string;
}
