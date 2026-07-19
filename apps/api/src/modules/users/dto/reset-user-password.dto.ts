import { IsString, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @IsString()
  @MinLength(10, { message: 'A senha temporária deve ter no mínimo 10 caracteres.' })
  newPassword!: string;
}