import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateVacationStatusDto {
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'])
  status!: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

  @IsOptional()
  @IsString()
  observation?: string;
}
