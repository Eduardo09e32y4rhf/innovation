import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLock } from '../../common/redis/cron-lock.decorator';
import { CandidateDeadlinesService } from './candidate-deadlines.service';

@Injectable()
export class CandidateDeadlinesCron {
  private readonly logger = new Logger(CandidateDeadlinesCron.name);

  constructor(private readonly deadlines: CandidateDeadlinesService) {}

  @Cron('40 * * * *')
  @CronLock('recruitment.candidate-deadlines', 1800)
  async hourly() {
    const expired = await this.deadlines.expireOverdue();
    const { reminded } = await this.deadlines.remindExpiring();
    if (expired.offers + expired.assessments + expired.slots + reminded) this.logger.log(`Prazos do candidato: vencidos ${JSON.stringify(expired)}; ${reminded} lembrete(s).`);
  }
}
