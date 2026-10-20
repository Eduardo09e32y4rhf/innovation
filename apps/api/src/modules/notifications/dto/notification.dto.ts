import { IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAdminNoticeDto {
  @IsOptional() @IsIn(['SIMPLE_NOTICE', 'PROMOTION_NOTICE', 'WARNING_NOTICE', 'SUSPENSION_NOTICE']) type?: string;
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(8000) message?: string;
  @IsOptional() @IsString() @MaxLength(8000) content?: string;
  @IsOptional() @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']) priority?: string;
  @IsOptional() @IsIn(['ALL', 'SPECIFIC', 'ROLE']) targetType?: string;
  @IsOptional() @IsString() @MaxLength(40) targetRole?: string;
  @IsOptional() @IsArray() @IsUUID('all', { each: true }) employeeIds?: string[];
  @IsOptional() @IsArray() @IsUUID('all', { each: true }) targetIds?: string[];
  @IsOptional() @IsString() @MaxLength(500) targetUrl?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsBoolean() requiresAcceptance?: boolean;
  @IsOptional() @IsBoolean() allowsRefusal?: boolean;
  @IsOptional() @IsBoolean() requiresAcknowledgment?: boolean;
  @IsOptional() @IsBoolean() requiresReadConfirmation?: boolean;
  @IsOptional() @IsBoolean() requiresResponse?: boolean;
  @IsOptional() @IsObject() extraJson?: Record<string, unknown>;
  @IsOptional() @IsArray() attachmentsJson?: unknown[];
  @IsOptional() @IsDateString() occurrenceDate?: string;
  @IsOptional() @IsString() @MaxLength(2000) legalReason?: string;
  @IsOptional() @IsNumber() suspensionDays?: number;
  @IsOptional() @IsString() @MaxLength(200) newPosition?: string;
  @IsOptional() @IsNumber() newSalary?: number;
  @IsOptional() @IsDateString() effectiveDate?: string;
  @IsOptional() @IsUUID() templateId?: string;
}

export class RespondNotificationDto {
  @IsIn(['ACKNOWLEDGE', 'ACCEPT', 'REFUSE']) action!: 'ACKNOWLEDGE' | 'ACCEPT' | 'REFUSE';
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}
