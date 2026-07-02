import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsIn(['DEV', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONÁRIO', 'CONSULTA'])
  role?: 'DEV' | 'COMERCIAL' | 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONÁRIO' | 'CONSULTA';
}