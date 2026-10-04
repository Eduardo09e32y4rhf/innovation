import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class MfaVerifyDto {
  @IsString() @MaxLength(2000)
  mfaToken!: string;

  @IsOptional() @IsString() @Length(6, 8)
  code?: string;

  @IsOptional() @IsString() @MaxLength(20)
  recoveryCode?: string;
}

export class MfaCodeDto {
  @IsString() @Length(6, 8)
  code!: string;
}

export class VerifyEmailDto {
  @IsString() @MaxLength(2000)
  token!: string;
}
