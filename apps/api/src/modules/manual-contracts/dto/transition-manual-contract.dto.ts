import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MANUAL_CONTRACT_STATUSES, ManualContractStatus } from '../manual-contract-status';

export class TransitionManualContractDto {
  @IsIn(MANUAL_CONTRACT_STATUSES)
  status!: ManualContractStatus;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
