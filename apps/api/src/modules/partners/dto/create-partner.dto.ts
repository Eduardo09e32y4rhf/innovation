import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePartnerDto {
  @IsString()
  @IsNotEmpty()
  legalName: string;

  @IsString()
  @IsOptional()
  tradeName?: string;

  @IsString()
  @IsNotEmpty()
  document: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
