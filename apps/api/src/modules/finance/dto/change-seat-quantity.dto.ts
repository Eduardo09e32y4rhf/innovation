import { IsInt, Max, Min } from 'class-validator';

export class ChangeSeatQuantityDto {
  @IsInt()
  @Min(1)
  @Max(10000)
  seatQuantity!: number;
}
