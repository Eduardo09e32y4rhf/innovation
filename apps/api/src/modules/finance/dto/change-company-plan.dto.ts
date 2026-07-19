import { IsString, MinLength } from 'class-validator';

export class ChangeCompanyPlanDto {
  @IsString()
  @MinLength(1)
  planId!: string;
}
