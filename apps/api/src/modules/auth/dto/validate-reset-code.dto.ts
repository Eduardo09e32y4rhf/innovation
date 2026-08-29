import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class ValidateResetCodeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(6)
  code!: string;

  @IsString()
  cpfStart!: string;

  @IsString()
  registration!: string;
}
