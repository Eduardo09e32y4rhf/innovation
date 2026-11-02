import { IsIn, IsNotEmpty } from 'class-validator';

// Mesmos valores do enum SupportTicketPriority do Prisma (MEDIUM nao existe no banco).
export class UpdateSupportPriorityDto {
  @IsIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'], { message: 'Prioridade do chamado inválida' })
  @IsNotEmpty({ message: 'Prioridade é obrigatória' })
  priority!: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
}
