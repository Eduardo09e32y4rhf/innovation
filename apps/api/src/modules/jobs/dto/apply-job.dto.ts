import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

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
  @IsString()
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

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  race?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  pcd?: string;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @Equals(true, { message: 'Consentimento obrigatorio para enviar a candidatura.' })
  consent!: boolean;
}
