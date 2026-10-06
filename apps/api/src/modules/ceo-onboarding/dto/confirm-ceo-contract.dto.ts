import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmCeoContractDto {
  /** Declaracao de que as assinaturas foram validadas em https://validar.iti.gov.br */
  @IsBoolean()
  checkedItiValidator!: boolean;

  /** Declaracao de que o PDF assinado e a minuta emitida (mesmo conteudo). */
  @IsBoolean()
  documentMatches!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}