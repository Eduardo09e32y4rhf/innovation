import { Module } from '@nestjs/common';
import { TimeTrackController } from './time-track.controller';
import { TimeTrackRepository } from './time-track.repository';
import { TimeTrackService } from './time-track.service';
import { WorkScheduleRulesController } from './work-schedule-rules.controller';
import { WorkScheduleRulesService } from './work-schedule-rules.service';
import { TimeClosingController } from './time-closing.controller';
import { TimeClosingService } from './time-closing.service';
import { TimeOccurrencesController } from './time-occurrences.controller';
import { TimeOccurrencesService } from './time-occurrences.service';
import { TimeCalculationRulesService } from './time-calculation-rules';

import { FacialRecognitionModule } from '../facial-recognition/facial-recognition.module';
import { HolidaysModule } from '../holidays/holidays.module';

@Module({
  imports: [FacialRecognitionModule, HolidaysModule],
  controllers: [TimeTrackController, WorkScheduleRulesController, TimeClosingController, TimeOccurrencesController],
  providers: [TimeTrackService, TimeTrackRepository, WorkScheduleRulesService, TimeClosingService, TimeOccurrencesService, TimeCalculationRulesService],
  exports: [TimeTrackService, TimeTrackRepository, WorkScheduleRulesService, TimeClosingService, TimeOccurrencesService, TimeCalculationRulesService],
})
export class TimeTrackModule {}
