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
import { TimeZoneService } from '../../common/services/timezone.service';

import { HolidaysModule } from '../holidays/holidays.module';

@Module({
  imports: [HolidaysModule],
  controllers: [TimeTrackController, WorkScheduleRulesController, TimeClosingController, TimeOccurrencesController],
  providers: [TimeTrackService, TimeTrackRepository, WorkScheduleRulesService, TimeClosingService, TimeOccurrencesService, TimeCalculationRulesService, TimeZoneService],
  exports: [TimeTrackService, TimeTrackRepository, WorkScheduleRulesService, TimeClosingService, TimeOccurrencesService, TimeCalculationRulesService, TimeZoneService],
})
export class TimeTrackModule {}
