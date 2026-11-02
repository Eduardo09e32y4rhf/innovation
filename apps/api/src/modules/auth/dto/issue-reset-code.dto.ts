import { IsUUID } from 'class-validator';

export class IssueResetCodeDto {
  @IsUUID()
  userId!: string;
}
