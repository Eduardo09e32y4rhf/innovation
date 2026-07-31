import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScheduleCoverageRuleDto {
  @IsString()
  department: string;

  @IsInt()
  @Min(1)
  minimumEmployees: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];
}

export class UpdateScheduleCoverageConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleCoverageRuleDto)
  rules: ScheduleCoverageRuleDto[];
}
