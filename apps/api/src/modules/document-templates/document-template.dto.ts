import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { TEMPLATE_KINDS } from './template-render';

export class CreateDocumentTemplateDto {
  @IsString() @MaxLength(100) name!: string;
  @IsIn(TEMPLATE_KINDS) kind!: string;
  @IsString() @MaxLength(150) title!: string;
  @IsString() @MaxLength(8000) body!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateDocumentTemplateDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsIn(TEMPLATE_KINDS) kind?: string;
  @IsOptional() @IsString() @MaxLength(150) title?: string;
  @IsOptional() @IsString() @MaxLength(8000) body?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class RenderDocumentTemplateDto {
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
  @IsOptional() @IsDateString() occurrenceDate?: string;
  @IsOptional() @IsInt() @Min(0) @Max(30) suspensionDays?: number;
}
