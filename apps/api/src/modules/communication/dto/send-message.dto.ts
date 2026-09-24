import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MediaDto {
  @IsString()
  @IsNotEmpty()
  base64!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsString()
  @IsOptional()
  name?: string;
}

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
  @ValidateNested()
  @Type(() => MediaDto)
  media?: MediaDto;
}
