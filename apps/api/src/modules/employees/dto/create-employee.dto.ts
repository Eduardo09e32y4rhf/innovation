import { Type } from 'class-transformer';
import { IsDateString, IsEmail, IsIn, IsNumber, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

const EMPLOYEE_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED'] as const;
const CONTRACT_TYPES = ['CLT', 'PJ', 'ESTAGIO', 'TEMPORARIO', 'JOVEM_APRENDIZ', 'TERCEIRIZADO'] as const;
const WORK_SCALES = ['5X2', '6X1', '12X36', '4X2', 'OUTRO'] as const;
const DAILY_WORKLOADS = ['08:00', '07:20', '06:00', '12:00', 'OUTRO'] as const;
const TIME_VALUE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateEmployeeDto {
  @IsString()
  name!: string;

  @IsString()
  cpf!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  registration?: string;

  @IsString()
  position!: string;

  @IsString()
  department!: string;

  @IsOptional()
  @IsUUID()
  managerId?: string;

  @IsDateString()
  admissionDate!: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salary?: number;

  @IsOptional()
  @IsIn(EMPLOYEE_STATUSES)
  status?: (typeof EMPLOYEE_STATUSES)[number];

  @IsOptional()
  @IsIn(CONTRACT_TYPES)
  contractType?: (typeof CONTRACT_TYPES)[number];

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsIn(WORK_SCALES)
  workScale?: (typeof WORK_SCALES)[number];

  @IsOptional()
  @IsString()
  customWorkScale?: string;

  @IsOptional()
  @IsIn(DAILY_WORKLOADS)
  dailyWorkload?: (typeof DAILY_WORKLOADS)[number];

  @IsOptional()
  @Matches(TIME_VALUE)
  standardEntry?: string;

  @IsOptional()
  @Matches(TIME_VALUE)
  standardLunchStart?: string;

  @IsOptional()
  @Matches(TIME_VALUE)
  standardLunchReturn?: string;

  @IsOptional()
  @Matches(TIME_VALUE)
  standardExit?: string;
}