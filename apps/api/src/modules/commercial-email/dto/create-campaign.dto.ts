import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { EmailCampaignType, PlatformNoticeType } from '@prisma/client';

export class RecipientInputDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsOptional() @IsString() @MaxLength(180) name?: string;
}

export class PreviewRecipientsDto {
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => RecipientInputDto) recipients!: RecipientInputDto[];
  @IsOptional() @IsEnum(EmailCampaignType) type?: EmailCampaignType;
}

export class CreateCampaignDto {
  @IsString() @MinLength(3) @MaxLength(180) subject!: string;
  @IsString() @MinLength(10) @MaxLength(20_000) bodyText!: string;
  @IsOptional() @IsEnum(EmailCampaignType) type?: EmailCampaignType;
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => RecipientInputDto) recipients!: RecipientInputDto[];
}

export class CreateNoticeDto {
  @IsString() @MinLength(3) @MaxLength(180) title!: string;
  @IsString() @MinLength(3) @MaxLength(10_000) body!: string;
  @IsOptional() @IsEnum(PlatformNoticeType) type?: PlatformNoticeType;
}
