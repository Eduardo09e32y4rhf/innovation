import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class HolidayItemDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsIn(['NATIONAL', 'STATE', 'MUNICIPAL'])
  scope?: 'NATIONAL' | 'STATE' | 'MUNICIPAL';
}

export class UpdateHolidaysDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => HolidayItemDto)
  holidays!: HolidayItemDto[];
}
