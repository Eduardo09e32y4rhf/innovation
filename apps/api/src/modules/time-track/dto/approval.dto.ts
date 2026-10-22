import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsUUID } from 'class-validator';

export class ApprovalDto {
  @IsBoolean() approved!: boolean;
}

export class BatchApprovalDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsUUID('all', { each: true }) ids!: string[];
  @IsBoolean() approved!: boolean;
}
