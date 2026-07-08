import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePlatformCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'CANCELLED'])
  status?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

  @IsOptional()
  @IsIn(['inadimplencia', 'solicitacao_voluntaria', 'nao informado'])
  suspensionReason?: string | null;

  @IsOptional()
  @IsIn(['FREE', 'BASE', 'PRO', 'ENTERPRISE'])
  plan?: 'FREE' | 'BASE' | 'PRO' | 'ENTERPRISE';

  @IsOptional()
  @IsIn(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED'])
  billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

  @IsOptional()
  @IsString()
  trialEndsAt?: string;

  @IsOptional()
  activeModules?: string[];

  @IsOptional()
  @IsString()
  internalNotes?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxEmployees?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  asaasCustomerId?: string | null;

  @IsOptional()
  @IsString()
  asaasSubscriptionId?: string | null;
}
