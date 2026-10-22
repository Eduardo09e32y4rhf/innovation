import { Module } from '@nestjs/common';
import { AnalyticsScheduler } from './analytics.scheduler';
import { AnalyticsService } from './analytics.service';
import { PlatformVisitsController, PublicVisitsController } from './analytics.controller';
import { GeoService } from './geo.service';

@Module({
  controllers: [PublicVisitsController, PlatformVisitsController],
  providers: [AnalyticsService, GeoService, AnalyticsScheduler],
})
export class AnalyticsModule {}
