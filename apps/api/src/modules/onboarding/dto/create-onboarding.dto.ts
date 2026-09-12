import { IsUUID } from 'class-validator';

export class CreateOnboardingFlowDto {
  @IsUUID()
  employeeId!: string;
}
