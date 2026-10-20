import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveFiscalAdjustmentDto {
  @IsIn(['RETRY_CANCEL', 'REISSUE', 'MARK_RESOLVED'])
  action!: 'RETRY_CANCEL' | 'REISSUE' | 'MARK_RESOLVED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
