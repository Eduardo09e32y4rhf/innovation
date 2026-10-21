import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class RecordVisitDto {
  @IsString()
  @MaxLength(200)
  @Matches(/^\/\S*$/, { message: 'Caminho invalido.' })
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referrer?: string;
}
