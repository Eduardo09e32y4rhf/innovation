import { IsOptional, IsString, IsIn, Matches, MaxLength } from 'class-validator';


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

  /** Protocolo completo ou parte dele (so os digitos contam; ex.: 202610211020121 ou 20261021). */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  protocol?: string;

  /** Abertos a partir deste dia (AAAA-MM-DD, dia de Sao Paulo). */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateFrom deve estar no formato AAAA-MM-DD.' })
  dateFrom?: string;

  /** Abertos ate este dia, inclusive (AAAA-MM-DD, dia de Sao Paulo). */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateTo deve estar no formato AAAA-MM-DD.' })
  dateTo?: string;
}

export { ListSupportTicketsQueryDto as ListsupportticketsqueryDto };