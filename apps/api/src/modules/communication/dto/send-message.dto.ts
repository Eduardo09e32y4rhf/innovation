import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsOptional()
  body!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  media?: {
    base64: string;
    mimeType: string;
    name?: string;
  };
}
