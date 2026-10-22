import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PlatformAssistantDto {
  @IsOptional() @IsString() @MaxLength(4000) question?: string;
}

export class ClassifyTicketDto {
  @IsString() @MaxLength(300) title!: string;
  @IsOptional() @IsString() @MaxLength(8000) description?: string;
}
