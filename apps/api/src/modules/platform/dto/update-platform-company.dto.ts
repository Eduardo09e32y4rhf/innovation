import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePlatformCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  plan?: any;

  @IsOptional()
  @IsInt()
  @Min(1)
  billingStatus?: any;

  @IsOptional()
  @IsBoolean()
  

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'CANCELLED'])
  status?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

  @IsOptional()
  @IsIn(['inadimplencia', 'solicitacao_voluntaria', 'nao informado'])
  suspensionReason?: string | null;

  @IsOptional()
  @IsIn(['FREE', 'STARTER', 'PRO'])
  plan?: 'FREE' | 'STARTER' | 'PRO';

  @IsOptional()
  @IsIn(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED'])
  billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

  @IsOptional()
  @IsString()
  trialEndsAt?: string;
}
