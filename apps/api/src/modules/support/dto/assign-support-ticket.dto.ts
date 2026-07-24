import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignSupportTicketDto {
  @IsUUID('4', { message: 'ID do operador deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID do operador é obrigatório' })
  assignedToUserId: string;
}