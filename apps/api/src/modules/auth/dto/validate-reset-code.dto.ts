import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class ValidateResetCodeDto {
  @IsEmail({}, { message: 'Formato de e-mail inválido' })
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'O código deve ter 6 caracteres' })
  code!: string;

  @IsString()
  @Length(3, 3, { message: 'Forneça os 3 primeiros dígitos do CPF' })
  @Matches(/^[0-9]{3}$/, { message: 'Formato de CPF inválido (apenas números)' })
  cpfStart!: string;

  @IsString()
  registration!: string;
}
