import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RevokeTimeTrackDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  reason!: string;
}