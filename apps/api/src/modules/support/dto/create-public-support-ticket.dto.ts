import { IsEnum, IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';
import { IsIn } from 'class-validator';


export class CreatePublicSupportTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;

  @IsOptional()
  @IsIn(['BUG', 'CORRECTION', 'ADJUSTMENT', 'MAINTENANCE', 'FEATURE_REQUEST', 'PASSWORD_RESET', 'ACCESS', 'BILLING', 'PERFORMANCE', 'SECURITY', 'INTEGRATION', 'OTHER'], { message: 'Categoria inválida' })
  category?: any;

  @IsString()
  @IsNotEmpty({ message: 'Assunto é obrigatório' })
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  description: string;

  @IsOptional()
  @IsString()
  pageUrl?: string;

  // Honeypot field - bots costumam preencher todos os campos de um form
  @IsOptional()
  @IsString()
  website?: string;
}

export { CreatePublicSupportTicketDto as CreatepublicsupportticketDto };