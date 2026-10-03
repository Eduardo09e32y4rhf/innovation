import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const STAGE_KINDS = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'] as const;
export const QUESTION_TYPES = ['TEXT', 'LONG', 'SELECT', 'MULTI', 'YESNO', 'NUMBER'] as const;

export class StageInputDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsIn(STAGE_KINDS as unknown as string[])
  kind!: (typeof STAGE_KINDS)[number];
}

export class SavePipelineDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => StageInputDto)
  stages!: StageInputDto[];
}

export class QuestionInputDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(300)
  label!: string;

  @IsIn(QUESTION_TYPES as unknown as string[])
  type!: (typeof QUESTION_TYPES)[number];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsObject()
  knockout?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  scoreRule?: Record<string, unknown> | null;
}

export class SaveQuestionsDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => QuestionInputDto)
  questions!: QuestionInputDto[];
}

export class CriterionInputDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(80)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  weight!: number;
}

export class SaveCriteriaDto {
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => CriterionInputDto)
  criteria!: CriterionInputDto[];
}

export class MoveApplicationDto {
  @IsUUID()
  stageId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  rejectionReason?: string;
}

export class BulkApplicationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  ids!: string[];

  @IsIn(['MOVE', 'TAG_ADD', 'TAG_REMOVE', 'FAVORITE'])
  action!: 'MOVE' | 'TAG_ADD' | 'TAG_REMOVE' | 'FAVORITE';

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsUUID()
  tagId?: string;

  @IsOptional()
  @IsBoolean()
  value?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  rejectionReason?: string;
}

export class NoteDto {
  @IsString()
  @MaxLength(3000)
  body!: string;
}

export class EvaluationItemDto {
  @IsUUID()
  criterionId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class SaveEvaluationsDto {
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => EvaluationItemDto)
  evaluations!: EvaluationItemDto[];
}

export class InterviewDto {
  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  kind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  interviewer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class TagDto {
  @IsString()
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class SetApplicationTagsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  tagIds!: string[];
}

export class UpdateApplicationMetaDto {
  @IsOptional()
  @IsBoolean()
  favorite?: boolean;
}

export class SavedViewDto {
  @IsString()
  @MaxLength(60)
  name!: string;

  @IsObject()
  filters!: Record<string, unknown>;
}
