import { IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  password?: string;

  @IsOptional()
  @IsIn(['DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'])
  role?: 'DEV' | 'CEO' | 'CONTABIL' | 'COMERCIAL' | 'ADMIN' | 'RH' | 'RH_RS' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customPermissions?: string[] | null;
}
