import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
export const DEPARTMENTS = ['CONTABIL', 'FISCAL', 'DP', 'LEGALIZACAO', 'CONSULTORIA', 'ATENDIMENTO'] as const;
export const PRIORITIES = ['LOW', 'NORMAL', 'HIGH'] as const;
export const TASK_STATUSES = ['OPEN', 'DOING', 'DONE'] as const;
export const DOC_TYPES = ['EXTRATO', 'NOTAS', 'FOLHA', 'ATESTADO', 'OUTROS'] as const;

export class SaveClientDto {
  @IsOptional() @IsIn(['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL']) taxRegime?: string;
  @IsOptional() @IsUUID() responsibleId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1_000_000) monthlyFee?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(28) feeDueDay?: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class CreateTaskDto {
  @IsOptional() @IsUUID() companyId?: string;
  @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsIn(DEPARTMENTS as unknown as string[]) department?: string;
  @IsOptional() @IsIn(PRIORITIES as unknown as string[]) priority?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsUUID() assigneeId?: string;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsIn(DEPARTMENTS as unknown as string[]) department?: string;
  @IsOptional() @IsIn(PRIORITIES as unknown as string[]) priority?: string;
  @IsOptional() @IsIn(TASK_STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsUUID() assigneeId?: string;
}

export class ChecklistToggleDto {
  @Matches(MONTH, { message: 'Mes invalido. Use AAAA-MM.' }) month!: string;
  @IsString() @MaxLength(40) itemKey!: string;
  @IsBoolean() done!: boolean;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class DocItemDto {
  @IsOptional() @IsIn(DOC_TYPES as unknown as string[]) docType?: string;
  @IsString() @MinLength(2) @MaxLength(160) title!: string;
}

export class CreateDocRequestDto {
  @IsUUID() companyId!: string;
  @Matches(MONTH, { message: 'Mes invalido. Use AAAA-MM.' }) month!: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => DocItemDto) items!: DocItemDto[];
}

export class UpdateDocRequestDto {
  @IsOptional() @IsIn(['PENDING', 'RECEIVED', 'CANCELLED']) status?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsBoolean() remind?: boolean;
}

export class GenerateFeesDto {
  @IsOptional() @Matches(MONTH, { message: 'Mes invalido. Use AAAA-MM.' }) month?: string;
}

export class PayFeeDto {
  @IsBoolean() paid!: boolean;
}
