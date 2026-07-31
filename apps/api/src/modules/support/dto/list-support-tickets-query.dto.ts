import { IsOptional, IsString, IsIn } from 'class-validator';


export class ListSupportTicketsQueryDto {
  @IsOptional()
  @IsIn(['NEW', 'TRIAGE', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_DEPLOY', 'RESOLVED', 'CLOSED'])
  status?: 'NEW' | 'TRIAGE' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_DEPLOY' | 'RESOLVED' | 'CLOSED';

  @IsOptional()
  @IsIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'])
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  @IsIn(['BUG', 'CORRECTION', 'ADJUSTMENT', 'MAINTENANCE', 'FEATURE_REQUEST', 'PASSWORD_RESET', 'ACCESS', 'BILLING', 'PERFORMANCE', 'SECURITY', 'INTEGRATION', 'OTHER'])
  category?: 'BUG' | 'CORRECTION' | 'ADJUSTMENT' | 'MAINTENANCE' | 'FEATURE_REQUEST' | 'PASSWORD_RESET' | 'ACCESS' | 'BILLING' | 'PERFORMANCE' | 'SECURITY' | 'INTEGRATION' | 'OTHER';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}

export { ListSupportTicketsQueryDto as ListsupportticketsqueryDto };