import { ArrayMaxSize, IsBoolean, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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
}