import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsObject, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CandidateEmailDto {
  @IsEmail()
  @MaxLength(240)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}

export class CandidateRegisterDto {
  @IsEmail()
  @MaxLength(240)
  email!: string;

  @IsString()
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}

export class CandidateLoginDto {
  @IsEmail()
  @MaxLength(240)
  email!: string;

  @IsString()
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}

export class CandidateResetPasswordDto {
  @IsEmail()
  @MaxLength(240)
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  @IsString()
  @MaxLength(128)
  password!: string;
}

/** Perfil mínimo (LGPD): só o necessário para se candidatar. Sem RG, PIS, banco, estado civil ou dependentes. */
export class CandidateUpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(180) name?: string;
  @IsOptional() @IsString() @MaxLength(20) cpf?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(12) cep?: string;
  @IsOptional() @IsString() @MaxLength(160) street?: string;
  @IsOptional() @IsString() @MaxLength(20) streetNumber?: string;
  @IsOptional() @IsString() @MaxLength(160) addressComplement?: string;
  @IsOptional() @IsString() @MaxLength(160) neighborhood?: string;
  @IsOptional() @IsString() @MaxLength(160) city?: string;
  @IsOptional() @IsString() @MaxLength(2) state?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  education?: Record<string, unknown>[];

  @IsOptional() @IsString() @MaxLength(10) birthDate?: string;
  @IsOptional() @IsString() @MaxLength(120) profession?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(15) skills?: string[];
  @IsOptional() @IsString() @MaxLength(1200) about?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) experience?: Record<string, unknown>[];
  @IsOptional() @IsBoolean() hasDriverLicense?: boolean;
  @IsOptional() @IsString() @MaxLength(3) driverLicenseCategory?: string;
  @IsOptional() @IsBoolean() talentPoolConsent?: boolean;
  @IsOptional() @IsBoolean() consent?: boolean;
  @IsOptional() @IsBoolean() admissionShareConsent?: boolean;
}

export class CandidateApplyDto {
  /** Respostas às perguntas da empresa (questionId -> valor). Sem perguntas, vai vazio e a candidatura sai direto. */
  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  coverLetter?: string;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  consent!: boolean;
}
