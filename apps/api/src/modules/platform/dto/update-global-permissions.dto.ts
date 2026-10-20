import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

export class UpdateGlobalPermissionsDto {
  @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) @MaxLength(100, { each: true }) permissions!: string[];
}
