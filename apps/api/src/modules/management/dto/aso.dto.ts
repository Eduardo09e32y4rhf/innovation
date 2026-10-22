import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// Valores de status/resultado/tipo/datas sao validados e normalizados por AsoService (normalize*/parse*).
export class AsoRecordDto {
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsString() @MaxLength(40) asoType?: string;
  @IsOptional() @IsString() @MaxLength(40) status?: string;
  @IsOptional() @IsString() @MaxLength(40) result?: string;
  @IsOptional() @IsString() @MaxLength(40) examDate?: string | null;
  @IsOptional() @IsString() @MaxLength(40) dueDate?: string | null;
  @IsOptional() @IsNumber() periodicityMonths?: number | null;
  @IsOptional() @IsString() @MaxLength(200) clinicName?: string | null;
  @IsOptional() @IsString() @MaxLength(300) clinicAddress?: string | null;
  @IsOptional() @IsString() @MaxLength(20) clinicCep?: string | null;
  @IsOptional() @IsString() @MaxLength(100) clinicCity?: string | null;
  @IsOptional() @IsString() @MaxLength(2) clinicState?: string | null;
  @IsOptional() @IsString() @MaxLength(30) clinicPhone?: string | null;
  @IsOptional() @IsString() @MaxLength(200) doctorName?: string | null;
  @IsOptional() @IsString() @MaxLength(60) documentNumber?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) observation?: string | null;
  @IsOptional() @IsBoolean() saveClinicPreset?: boolean;
}

export class AsoClinicPresetDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(20) cep?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(2) state?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(200) doctorName?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
