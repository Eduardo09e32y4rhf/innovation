import { Module } from '@nestjs/common';
import { ScheduleAccessModule } from '../schedule/access/schedule-access.module';
import { TimeTrackModule } from '../time-track/time-track.module';
import { EscalaModule } from '../schedule/escala.module';
import { CalendarService } from './calendar/calendar.service';
import { DayResolver } from './calendar/day-resolver';
import { HubController } from './hub.controller';
import { HubNotifyService } from './notify.service';
import { OverridesService } from './overrides/overrides.service';
import { OverviewService } from './overview/overview.service';
import { PolicyController } from './policy/policy.controller';
import { PolicyService } from './policy/policy.service';
import { PunchController } from './punch/punch.controller';
import { PunchService } from './punch/punch.service';
import { RequestsController } from './requests/requests.controller';
import { RequestsService } from './requests/requests.service';

@Module({
  imports: [ScheduleAccessModule, TimeTrackModule, EscalaModule],
  controllers: [HubController, PolicyController, PunchController, RequestsController],
  providers: [DayResolver, CalendarService, OverviewService, OverridesService, PolicyService, PunchService, RequestsService, HubNotifyService],
  exports: [DayResolver, PolicyService],
})
export class ScheduleHubModule {}
