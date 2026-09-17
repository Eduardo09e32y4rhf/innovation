import { PartialType } from '@nestjs/mapped-types';
import { CreatePlatformPlanDto } from './create-platform-plan.dto';

export class UpdatePlatformPlanDto extends PartialType(CreatePlatformPlanDto) {}
