import { IsEnum, IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';
import { SupportTicketCategory } from '@prisma/client';

export class CreatePublicSupportTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;

  @IsOptional()
  @IsEnum(SupportTicketCategory, { message: 'Categoria inválida' })
  category?: SupportTicketCategory;

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