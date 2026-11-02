import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Campo opcional aceito nos corpos das rotas protegidas por Turnstile (o token tambem pode vir no header). */
export class TurnstileTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}
