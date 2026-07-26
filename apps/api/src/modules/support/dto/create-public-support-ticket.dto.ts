import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreatePublicSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 10000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  honeypot?: string;
}
