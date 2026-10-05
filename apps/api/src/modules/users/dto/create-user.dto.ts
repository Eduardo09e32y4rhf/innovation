import { IsArray, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  /** Opcional: sem senha o servidor gera uma provisória forte. */
  @IsOptional()
  @IsString()
  @MinLength(10)
  password?: string;

  @IsOptional()
  @IsIn(['DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'])
  role?: 'DEV' | 'CEO' | 'CONTABIL' | 'COMERCIAL' | 'ADMIN' | 'RH' | 'RH_RS' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customPermissions?: string[] | null;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
