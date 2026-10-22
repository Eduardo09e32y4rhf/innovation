import { IsOptional, IsString, MaxLength } from 'class-validator';

// Valores de tipo/status/prioridade/datas/link sao validados por pickEventData; aqui so se declaram os campos aceitos.
export class ManagementEventDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(40) eventType?: string;
  @IsOptional() @IsString() @MaxLength(40) status?: string;
  @IsOptional() @IsString() @MaxLength(40) priority?: string;
  @IsOptional() @IsString() @MaxLength(40) startDateTime?: string;
  @IsOptional() @IsString() @MaxLength(40) endDateTime?: string | null;
  @IsOptional() @IsString() @MaxLength(64) responsibleUserId?: string | null;
  @IsOptional() @IsString() @MaxLength(64) employeeId?: string | null;
  @IsOptional() @IsString() @MaxLength(300) location?: string | null;
  @IsOptional() @IsString() @MaxLength(500) meetingUrl?: string | null;
}
