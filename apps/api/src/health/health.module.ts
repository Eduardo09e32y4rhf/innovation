import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';

@Module({
  controllers: [HealthController, MetricsController],
})
export class HealthModule {}
