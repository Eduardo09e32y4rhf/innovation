import { IsOptional, IsString, IsEnum } from 'class-validator';
import { SupportTicketStatus, SupportTicketPriority, SupportTicketCategory } from '@prisma/client';

export class ListSupportTicketsQueryDto {
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsOptional()
  @IsEnum(SupportTicketCategory)
  category?: SupportTicketCategory;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}

export { ListSupportTicketsQueryDto as ListsupportticketsqueryDto };