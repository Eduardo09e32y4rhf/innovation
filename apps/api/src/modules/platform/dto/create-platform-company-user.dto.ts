import { IsArray, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

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
  @IsIn(['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO'])
  role?: 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customPermissions?: string[] | null;
}
