import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
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
  Max,
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
  @IsIn(['OPEN', 'CLOSED', 'DRAFT', 'PAUSED', 'FILLED'])
  status?: 'OPEN' | 'CLOSED' | 'DRAFT' | 'PAUSED' | 'FILLED';

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

  /** Nota minima da triagem (0 a 100%). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  screeningMinScore?: number | null;

  @IsOptional()
  @IsIn(['FLAG', 'REJECT'])
  screeningAction?: 'FLAG' | 'REJECT' | null;

  /** Roteiro de entrevista: perguntas sugeridas para quem entrevista. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  interviewGuide?: string[];

  @IsOptional()
  @IsBoolean()
  salaryHidden?: boolean;

  @IsOptional()
  @IsDateString()
  deadline?: string | null;

  @IsOptional()
  @IsUUID()
  pipelineId?: string | null;

  /** Processo interno: só funcionários da empresa se candidatam (pela matrícula); não aparece no portal público. */
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  /** Vaga confidencial (reposição/substituição): fora das listas públicas, acessível só por link direto. */
  @IsOptional()
  @IsBoolean()
  confidential?: boolean;

  /** Vaga afirmativa para pessoas com deficiencia (PCD). */
  @IsOptional()
  @IsBoolean()
  pcd?: boolean;
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
