import { Module } from '@nestjs/common';
import { ManagementEventsController } from './management-events.controller';
import { ManagementEventsService } from './management-events.service';
import { AsoController } from './aso.controller';
import { AsoService } from './aso.service';

@Module({
  controllers: [ManagementEventsController, AsoController],
  providers: [ManagementEventsService, AsoService],
  exports: [ManagementEventsService, AsoService],
})
export class ManagementModule {}