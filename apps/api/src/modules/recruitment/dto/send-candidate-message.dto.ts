import { IsString } from 'class-validator';

export class SendCandidateMessageDto {
  @IsString()
  body!: string;
}
