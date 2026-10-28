import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { redisConnection } from '../../common/redis/redis-config';
import { MailModule } from '../mail/mail.module';
import { EMAIL_QUEUE_OPTIONS } from './email-queue.config';
import { EmailSendWorker } from './workers/email-send.worker';

/** A standalone application context: does not import the API, database, cron jobs or WhatsApp. */
@Module({
  imports: [
    MailModule,
    BullModule.forRoot({ redis: redisConnection() }),
    BullModule.registerQueue(EMAIL_QUEUE_OPTIONS),
  ],
  providers: [EmailSendWorker],
})
export class EmailWorkerModule {}
