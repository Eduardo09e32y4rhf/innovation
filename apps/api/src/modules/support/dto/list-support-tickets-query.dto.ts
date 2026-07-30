import { IsOptional, IsString, IsEnum } from 'class-validator';
import { $Enums } from '@prisma/client';
type SupportTicketStatus = $Enums.SupportTicketStatus;
const SupportTicketStatus = $Enums.SupportTicketStatus;
type SupportTicketPriority = $Enums.SupportTicketPriority;
const SupportTicketPriority = $Enums.SupportTicketPriority;
type SupportTicketCategory = $Enums.SupportTicketCategory;
const SupportTicketCategory = $Enums.SupportTicketCategory;

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