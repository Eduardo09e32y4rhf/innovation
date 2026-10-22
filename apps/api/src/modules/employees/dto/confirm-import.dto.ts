import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmImportDto {
  @IsOptional() @IsString() @MaxLength(500) importToken?: string;
}
