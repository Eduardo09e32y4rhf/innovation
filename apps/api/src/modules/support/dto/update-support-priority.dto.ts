import { IsEnum, IsNotEmpty } from 'class-validator';
import { SupportTicketPriority } from '@prisma/client';

export class UpdateSupportPriorityDto {
  @IsEnum(SupportTicketPriority, { message: 'Prioridade do chamado inválida' })
  @IsNotEmpty({ message: 'Prioridade é obrigatória' })
  priority: SupportTicketPriority;
}