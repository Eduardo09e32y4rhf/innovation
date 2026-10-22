import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLock } from '../../common/redis/cron-lock.decorator';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsScheduler {
  private readonly logger = new Logger(AnalyticsScheduler.name);

  constructor(private readonly analytics: AnalyticsService) {}

  @Cron('30 3 * * *', { timeZone: 'America/Sao_Paulo' })
  @CronLock('analytics.purge', 3600)
  async purge() {
    const result = await this.analytics.purge();
    this.logger.log(`Visitas: ${result.keysCleared} chaves de visitante apagadas, ${result.removed} registros antigos removidos.`);
  }
}
