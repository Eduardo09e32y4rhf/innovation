import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}
