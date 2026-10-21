import { Equals, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class RecordVisitDto {
  /** O front so envia depois do aceite no aviso de cookies; sem isso a visita nao e registrada. */
  @Equals(true, { message: 'Consentimento necessario.' })
  consent!: boolean;

  @IsString()
  @MaxLength(200)
  @Matches(/^\/\S*$/, { message: 'Caminho invalido.' })
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referrer?: string;
}
