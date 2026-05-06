import { IsIn } from 'class-validator';

export class UpdateConversationStatusDto {
  @IsIn(['OPEN', 'PENDING', 'CLOSED'])
  status!: 'OPEN' | 'PENDING' | 'CLOSED';
}
