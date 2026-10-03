import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export const WORK_MODES = ['PRESENCIAL', 'HIBRIDO', 'REMOTO'] as const;

class JobFieldsDto {
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
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @IsOptional()
  @IsIn(['OPEN', 'CLOSED', 'DRAFT'])
  status?: 'OPEN' | 'CLOSED' | 'DRAFT';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsIn(WORK_MODES as unknown as string[])
  workMode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  seniority?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  openings?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryMax?: number;

  @IsOptional()
  @IsBoolean()
  salaryHidden?: boolean;

  @IsOptional()
  @IsDateString()
  deadline?: string | null;

  @IsOptional()
  @IsUUID()
  pipelineId?: string | null;
}

export class CreateJobDto extends JobFieldsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(12000)
  description!: string;
}

export class UpdateJobDto extends JobFieldsDto {
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
}
