import { IsEmail, IsIn, IsOptional, IsString, IsUUID, IsArray, ArrayMaxSize } from 'class-validator';

const ACCESS_PROFILES = ['FUNCIONARIO', 'GESTOR', 'RH', 'ADMIN', 'CONSULTA'] as const;
const BULK_ACTIONS = ['create', 'block', 'unblock', 'reset-password', 'set-role'] as const;

export class CreateEmployeeAccessDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn(ACCESS_PROFILES)
  role?: (typeof ACCESS_PROFILES)[number];

  @IsOptional()
  @IsString()
  name?: string;
}

export class LinkEmployeeAccessDto {
  @IsUUID()
  userId!: string;
}

export class BulkEmployeeAccessDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  employeeIds!: string[];

  @IsIn(BULK_ACTIONS)
  action!: (typeof BULK_ACTIONS)[number];

  @IsOptional()
  @IsIn(ACCESS_PROFILES)
  role?: (typeof ACCESS_PROFILES)[number];
}

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsIn(ACCESS_PROFILES)
  role!: (typeof ACCESS_PROFILES)[number];

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
