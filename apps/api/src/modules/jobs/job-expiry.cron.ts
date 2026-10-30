import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLock } from '../../common/redis/cron-lock.decorator';
import { JobExpiryService } from './job-expiry.service';

@Injectable()
export class JobExpiryCron {
  private readonly logger = new Logger(JobExpiryCron.name);

  constructor(private readonly expiry: JobExpiryService) {}

  @Cron('10 0 * * *', { timeZone: 'America/Sao_Paulo' })
  @CronLock('recruitment.job-expiry', 600)
  async daily() {
    const { closed } = await this.expiry.closeExpired();
    if (closed) this.logger.log(`${closed} vaga(s) encerrada(s) pelo prazo.`);
  }
}
