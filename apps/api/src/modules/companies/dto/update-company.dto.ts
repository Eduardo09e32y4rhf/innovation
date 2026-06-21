import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const SAFE_LOGO_URL = /^https:\/\/[^\s?#]+\.(png|jpe?g|webp)(\?[^\s#]*)?(#[^\s]*)?$/i;

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(SAFE_LOGO_URL, { message: 'logoUrl must be an HTTPS PNG, JPG or WebP URL.' })
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  theme?: string;
}