import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  employmentType?: string;

  @IsOptional()
  @IsString()
  salaryRange?: string;

  @IsOptional()
  @IsArray()
  benefits?: string[];
}

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  employmentType?: string;

  @IsOptional()
  @IsString()
  salaryRange?: string;

  @IsOptional()
  @IsArray()
  benefits?: string[];

  @IsOptional()
  @IsIn(['OPEN', 'CLOSED', 'DRAFT'])
  status?: 'OPEN' | 'CLOSED' | 'DRAFT';
}
