import { Module } from '@nestjs/common';
import { TimeTrackController } from './time-track.controller';
import { TimeTrackRepository } from './time-track.repository';
import { TimeTrackService } from './time-track.service';

@Module({
  controllers: [TimeTrackController],
  providers: [TimeTrackService, TimeTrackRepository],
  exports: [TimeTrackService, TimeTrackRepository],
})
export class TimeTrackModule {}
