import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateSupportStatusDto {
  @IsIn(['NEW', 'TRIAGE', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_DEPLOY', 'RESOLVED', 'CLOSED', 'OPEN', 'REOPENED'], { message: 'Status do chamado inválido' })
  @IsNotEmpty({ message: 'Status é obrigatório' })
  status: 'NEW' | 'TRIAGE' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_DEPLOY' | 'RESOLVED' | 'CLOSED' | 'OPEN' | 'REOPENED';
}
