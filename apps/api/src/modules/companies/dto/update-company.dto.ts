import { IsOptional, IsString, IsNumber, IsInt, Min, Max, MaxLength, MinLength, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'safeLogoValue', async: false })
export class SafeLogoConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (value === null || value === undefined || value === '') return true;
    const str = String(value);
    // Accept base64 image data URLs (created from Canvas - safe by design)
    if (/^data:image\/(png|jpeg|webp);base64,/.test(str)) return true;
    // Accept HTTPS URLs ending in image extensions
    return /^https:\/\/[^\s?#]+\.(png|jpe?g|webp)(\?[^\s#]*)?(#[^\s]*)?$/i.test(str);
  }
  defaultMessage() {
    return 'logoUrl must be an HTTPS image URL or a base64 image (PNG, JPG, WebP).';
  }
}

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
  @MaxLength(5_000_000) // ~3.75 MB base64
  @Validate(SafeLogoConstraint)
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

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(5000)
  radiusTolerance?: number;
}