import { IsArray, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePlatformCompanyUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  /** Ignorado: a senha provisoria e sempre gerada pelo servidor. Mantido so por compatibilidade de clientes antigos. */
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO'])
  role?: 'ADMIN' | 'RH' | 'RH_RS' | 'GESTOR' | 'FUNCIONARIO';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customPermissions?: string[] | null;
}
