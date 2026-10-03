import { Module } from '@nestjs/common';
import { ScheduleScopeService } from './schedule-scope.service';

@Module({
  providers: [ScheduleScopeService],
  exports: [ScheduleScopeService],
})
export class ScheduleAccessModule {}
