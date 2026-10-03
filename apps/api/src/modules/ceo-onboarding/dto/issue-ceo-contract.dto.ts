import { IsString, Length } from 'class-validator';

export class IssueCeoContractDto {
  @IsString()
  @Length(1, 80)
  version!: string;

  @IsString()
  @Length(20, 200000)
  contentHtml!: string;
}
