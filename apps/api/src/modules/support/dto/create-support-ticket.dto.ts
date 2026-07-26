import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateSupportTicketDto {
  @IsIn(['DOUBT', 'LOGIN_ISSUE', 'SYSTEM_BUG', 'FINANCIAL', 'OTHER', 'FEATURE_REQUEST', 'PASSWORD_RESET', 'SECURITY'], { message: 'Categoria inválida' })
  @IsNotEmpty({ message: 'Categoria é obrigatória' })
  category: 'DOUBT' | 'LOGIN_ISSUE' | 'SYSTEM_BUG' | 'FINANCIAL' | 'OTHER' | 'FEATURE_REQUEST' | 'PASSWORD_RESET' | 'SECURITY';

  @IsString()
  @IsNotEmpty({ message: 'Título é obrigatório' })
  @Length(5, 150, { message: 'O título deve ter entre 5 e 150 caracteres' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @Length(10, 10000, { message: 'A descrição deve ter entre 10 e 10000 caracteres' })
  description: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário afetado deve ser um UUID válido' })
  affectedUserId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID do funcionário afetado deve ser um UUID válido' })
  affectedEmployeeId?: string;

  @IsOptional()
  @IsString()
  impact?: string;
}
