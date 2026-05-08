import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export const APPLICATION_STATUSES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'] as const;

export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];

export class ReviewApplicationTransitionDto {
  @IsOptional()
  @IsIn(APPLICATION_STATUSES)
  status?: ApplicationStatusValue;
}

export class ConfirmApplicationTransitionDto {
  @IsIn(APPLICATION_STATUSES)
  status!: ApplicationStatusValue;

  @IsBoolean()
  confirmed!: boolean;

  @IsOptional()
  @IsBoolean()
  notifyCandidate?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  message?: string;
}
