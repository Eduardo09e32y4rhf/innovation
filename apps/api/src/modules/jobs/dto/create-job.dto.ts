import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(12000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  employmentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  salaryRange?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsIn(['OPEN', 'CLOSED', 'DRAFT'])
  status?: 'OPEN' | 'CLOSED' | 'DRAFT';
}

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(12000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  employmentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  salaryRange?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsIn(['OPEN', 'CLOSED', 'DRAFT'])
  status?: 'OPEN' | 'CLOSED' | 'DRAFT';
}
