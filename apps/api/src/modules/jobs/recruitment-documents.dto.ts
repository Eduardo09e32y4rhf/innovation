import { Matches, IsDateString, ArrayMaxSize, IsBoolean, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateDocumentRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  items!: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}

export class ReviewDocumentDto {
  @IsIn(['APPROVED', 'RETURNED'])
  decision!: 'APPROVED' | 'RETURNED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  /** Vencimento do documento (CNH, certidoes, vacina, ASO). Obrigatorio para aprovar os tipos que o exigem. */
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class VerifyCodeDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'O codigo tem 6 numeros.' })
  code!: string;
}

export class ReissueDocumentRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}