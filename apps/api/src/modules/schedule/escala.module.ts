import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { ScheduleSwapService } from './schedule-swap.service';
import { ScheduleSwapController } from './schedule-swap.controller';

@Module({
  controllers: [ScheduleController, ScheduleSwapController],
  providers: [ScheduleService, ScheduleSwapService],
  exports: [ScheduleService, ScheduleSwapService],
})
export class EscalaModule {}
