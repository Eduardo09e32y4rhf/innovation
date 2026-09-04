import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateResetCodeDto {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  cpfStart!: string;

  @IsString()
  @IsNotEmpty()
  registration!: string;
}
