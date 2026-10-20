import { PartialType } from '@nestjs/swagger';
import { CreateScheduleDto } from './create-schedule.dto';

// Partial<Class> some em runtime (metadados de validacao se perdem); PartialType preserva os decoradores.
export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}
