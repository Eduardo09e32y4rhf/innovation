import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, IsNumber } from 'class-validator';

export class UpdateCommunicationSettingsDto {
  @IsOptional()
  @IsIn(['gemini', 'gpt'])
  aiEngine?: 'gemini' | 'gpt';

  @IsOptional()
  @IsString()
  geminiApiKey?: string;

  @IsOptional()
  @IsString()
  openAiApiKey?: string;

  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  automaticSchedulingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  customCalendarMessageEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  prompt?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;
}
