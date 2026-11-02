import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class DelegateJobDto {
  @IsUUID()
  jobId!: string;
}

export class SetDelegationGrantsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  userIds!: string[];
}
