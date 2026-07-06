import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 50;

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.pageSize ?? 50);
  }

  get take(): number {
    return this.pageSize ?? 50;
  }
}
