import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class GenerateMessageDto {
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class SummarizeConversationDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;
}

export class AnalyzeCandidateDto {
  @IsString()
  @IsNotEmpty()
  candidateId!: string;
}
