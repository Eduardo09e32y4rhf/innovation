import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class ReasonDto {
  @IsOptional() @IsString() @MaxLength(300)
  reason?: string;
}

export class LinkEmployeeDto {
  /** null remove o vínculo. */
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  employeeId!: string | null;
}

export class PageViewDto {
  @IsString() @MaxLength(200)
  path!: string;
}

export class ActivityQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365)
  days?: number;

  @IsOptional() @IsString() @MaxLength(40)
  since?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(2000)
  limit?: number;
}

export class LinkableQueryDto {
  @IsOptional() @IsString() @MaxLength(80)
  search?: string;

  @IsOptional() @IsUUID()
  companyId?: string;
}