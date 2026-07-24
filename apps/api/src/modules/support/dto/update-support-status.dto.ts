import { IsEnum, IsNotEmpty } from 'class-validator';
import { SupportTicketStatus } from '@prisma/client';

export class UpdateSupportStatusDto {
  @IsEnum(SupportTicketStatus, { message: 'Status do chamado inválido' })
  @IsNotEmpty({ message: 'Status é obrigatório' })
  status: SupportTicketStatus;
}