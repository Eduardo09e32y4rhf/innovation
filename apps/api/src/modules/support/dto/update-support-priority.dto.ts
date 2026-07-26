import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateSupportPriorityDto {
  @IsIn(['LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'CRITICAL'], { message: 'Prioridade do chamado inválida' })
  @IsNotEmpty({ message: 'Prioridade é obrigatória' })
  priority: 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
