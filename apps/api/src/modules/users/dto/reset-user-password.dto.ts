import { IsString, MinLength, IsOptional } from 'class-validator';

export class ResetUserPasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;
}