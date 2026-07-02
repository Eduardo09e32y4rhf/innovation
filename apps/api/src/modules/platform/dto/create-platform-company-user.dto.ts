import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePlatformCompanyUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsIn(['ADMIN', 'RH', 'GESTOR', 'FUNCIONÁRIO'])
  role?: 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONÁRIO';
}
