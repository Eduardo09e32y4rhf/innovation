import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class UpdateCeoProfileDto {
  @IsString()
  @Length(2, 160)
  legalName!: string;

  @IsString()
  @Length(11, 18)
  cpf!: string;

  @IsDateString()
  birthDate!: string;

  @IsOptional()
  data?: Record<string, unknown>;
}
