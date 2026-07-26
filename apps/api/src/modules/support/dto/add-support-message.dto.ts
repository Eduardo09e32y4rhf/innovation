import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class AddSupportMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Mensagem não pode ser vazia' })
  @Length(1, 10000, { message: 'Mensagem deve ter entre 1 e 10000 caracteres' })
  message: string;

  @IsOptional()
  @IsIn(['PUBLIC', 'INTERNAL'], { message: 'Visibilidade inválida' })
  visibility?: 'PUBLIC' | 'INTERNAL';
}
