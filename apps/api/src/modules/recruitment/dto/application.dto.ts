import { IsIn, IsString } from 'class-validator';
import { APPLICATION_STATUSES, type ApplicationStatusValue } from './application-transition.dto';

export class CreateApplicationDto {
  @IsString()
  candidateId!: string;

  @IsString()
  jobId!: string;
}

export class UpdateApplicationStatusDto {
  @IsIn(APPLICATION_STATUSES)
  status!: ApplicationStatusValue;
}
