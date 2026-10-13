import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;
}
