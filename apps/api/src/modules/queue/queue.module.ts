import { redisConnection } from '../../common/redis/redis-config';
import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PdfGenerationWorker } from './workers/pdf-generation.worker';
import { WhatsappSendWorker } from './workers/whatsapp-send.worker';
import { EMAIL_QUEUE_OPTIONS } from './email-queue.config';
import { MailModule } from '../mail/mail.module';
import { EmailSendWorker } from './workers/email-send.worker';
import { PrivacyModule } from '../privacy/privacy.module';
import { CommunicationModule } from '../communication/communication.module';

@Module({
  imports: [
    MailModule,
    BullModule.forRoot({
      redis: redisConnection(),
    }),
    BullModule.registerQueue(
      { name: 'pdf-generation' },
      { name: 'whatsapp-send' },
      EMAIL_QUEUE_OPTIONS,
    ),
    forwardRef(() => PrivacyModule),
    forwardRef(() => CommunicationModule),
  ],
  providers: [PdfGenerationWorker, WhatsappSendWorker, ...(process.env.EMAIL_WORKER_EXTERNAL === 'true' ? [] : [EmailSendWorker])],
  exports: [BullModule],
})
export class QueueModule {}
