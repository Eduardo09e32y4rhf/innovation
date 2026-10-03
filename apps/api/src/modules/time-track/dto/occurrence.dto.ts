import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export const OCCURRENCE_TYPES = [
  'LATE_ARRIVAL', 'EARLY_LEAVE', 'ABSENCE', 'JUSTIFIED_ABSENCE', 'UNJUSTIFIED_ABSENCE', 'MEDICAL_CERTIFICATE',
  'MANUAL_ADJUSTMENT', 'MISSING_PUNCH', 'OVERTIME', 'NEGATIVE_BALANCE', 'POSITIVE_BALANCE', 'DAY_OFF', 'DSR',
  'HOLIDAY', 'VACATION', 'LEAVE', 'EXTERNAL_WORK', 'HOME_OFFICE', 'TRAINING',
] as const;

export class CreateOccurrenceDto {
  @IsUUID()
  employeeId!: string;

  @IsIn(OCCURRENCE_TYPES as unknown as string[])
  type!: (typeof OCCURRENCE_TYPES)[number];

  @IsDateString()
  date!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  minutes!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observation?: string;
}

export class DecideOccurrenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
