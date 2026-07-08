import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePlatformCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  document?: string;



  @IsOptional()
  @IsBoolean()
  

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
}
