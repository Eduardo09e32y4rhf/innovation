import { IsUUID } from 'class-validator';

export class MarkSupportDuplicateDto {
  @IsUUID('all', { message: 'Informe um chamado original válido.' })
  duplicateOfId: string;
}
