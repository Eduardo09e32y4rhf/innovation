import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class ValidateResetCodeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  /** Obrigatório apenas para usuários vinculados a um funcionário (validado no serviço). */
  @IsOptional()
  @Matches(/^\d{3}$/, { message: 'Informe os 3 primeiros dígitos do CPF.' })
  cpfStart?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  registration?: string;
}
