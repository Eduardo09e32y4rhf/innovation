import { IsEmail, IsInt, IsNumber, IsOptional, IsPositive, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateEngagementDto {
  /** CNPJ ou CPF da empresa-cliente, somente numeros. A empresa precisa ja ter conta na plataforma. */
  @IsString()
  @Matches(/^\d{11}$|^\d{14}$/, { message: 'Informe um CPF ou CNPJ valido (somente numeros).' })
  clientCompanyDocument!: string;

  @IsOptional() @IsString() @MaxLength(2000) scope?: string;
  @IsOptional() @IsInt() @Min(1) @Max(1000) contractedPositions?: number;
  @IsOptional() @IsNumber() @IsPositive() positionValue?: number;
  @IsOptional() @IsNumber() @IsPositive() signupFee?: number;
  @IsOptional() @IsNumber() @IsPositive() monthlyFee?: number;
  @IsOptional() @IsInt() @Min(0) @Max(365) warrantyDays?: number;
  @IsOptional() @IsString() @MaxLength(150) contactName?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(30) contactPhone?: string;
}
