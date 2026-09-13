import { IsNotEmpty, IsString, IsDate, IsArray, ValidateNested, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEvaluationDto {
  @IsNotEmpty()
  @IsString()
  reviewerId: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsNotEmpty()
  @IsNumber()
  score: number;
}

export class CreateReviewDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  periodStart: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  periodEnd: Date;

  @IsNotEmpty()
  @IsString()
  status: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEvaluationDto)
  evaluations?: CreateEvaluationDto[];
}
