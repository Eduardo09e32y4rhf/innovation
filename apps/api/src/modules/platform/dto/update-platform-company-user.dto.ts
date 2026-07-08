import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePlatformCompanyUserDto {
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
  @IsIn(['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO'])
  role?: 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  customPermissions?: any;
}
