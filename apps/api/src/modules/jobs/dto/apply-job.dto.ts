import { IsEmail, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class ApplyJobDto {
  @IsString()
  @MaxLength(180)
  name!: string;

  @IsEmail()
  @MaxLength(240)
  email!: string;

  @IsString()
  @MaxLength(40)
  phone!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  coverLetter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
