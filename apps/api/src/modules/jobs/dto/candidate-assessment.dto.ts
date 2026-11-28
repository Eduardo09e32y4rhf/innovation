import { IsBoolean, IsInt, IsObject, IsString, Max, MaxLength, Min } from 'class-validator';

export class SaveCandidateAssessmentDto {
  @IsInt() @Min(0) @Max(1000000) revision!: number;
  @IsObject() answers!: Record<string, number>;
  @IsString() @MaxLength(12000) essay!: string;
  @IsBoolean() complete!: boolean;
  @IsBoolean() shareConsent!: boolean;
}
export class ShareCandidateAssessmentDto {
  @IsBoolean() shareConsent!: boolean;
}
