import { IsString, Matches, MinLength } from 'class-validator';

export class AdminResetEmployeePasswordDto {
  @IsString()
  employeeId!: string;

  @IsString()
  @MinLength(10)
  @Matches(/[A-Z]/, {
    message: 'A senha deve possuir pelo menos uma letra maiúscula',
  })
  @Matches(/[a-z]/, {
    message: 'A senha deve possuir pelo menos uma letra minúscula',
  })
  @Matches(/[0-9]/, {
    message: 'A senha deve possuir pelo menos um número',
  })
  @Matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/, {
    message: 'A senha deve possuir pelo menos um caractere especial',
  })
  newPassword!: string;
}
