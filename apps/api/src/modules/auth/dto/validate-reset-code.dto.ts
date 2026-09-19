import { IsEmail, IsString } from 'class-validator';

export class ValidateResetCodeDto {
  @IsEmail()
  email!: string;

  @IsString()
  code!: string;

  @IsString()
  cpfStart!: string;

  @IsString()
  registration!: string;
}
