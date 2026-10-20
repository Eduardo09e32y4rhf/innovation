import { IsOptional, IsUUID } from 'class-validator';

export class AssignTicketDto {
  @IsOptional() @IsUUID() userId?: string;
}
