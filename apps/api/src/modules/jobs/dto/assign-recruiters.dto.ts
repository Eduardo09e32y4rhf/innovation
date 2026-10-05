import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class AssignRecruitersDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  userIds!: string[];
}