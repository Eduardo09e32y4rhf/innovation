import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsIn(['DEV', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONÁRIO', 'CONSULTA'])
  role?: 'DEV' | 'COMERCIAL' | 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONÁRIO' | 'CONSULTA';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}