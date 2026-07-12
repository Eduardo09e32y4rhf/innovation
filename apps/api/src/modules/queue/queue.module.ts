import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PdfGenerationWorker } from './workers/pdf-generation.worker';
import { WhatsappSendWorker } from './workers/whatsapp-send.worker';
import { EmailSendWorker } from './workers/email-send.worker';
import { PrivacyModule } from '../privacy/privacy.module';

const redisHost = process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : (process.env.REDIS_HOST || 'localhost');
const redisPort = process.env.REDIS_URL ? parseInt(new URL(process.env.REDIS_URL).port || '6379') : parseInt(process.env.REDIS_PORT || '6379');

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: redisHost,
        port: redisPort,
      },
    }),
    BullModule.registerQueue(
      { name: 'pdf-generation' },
      { name: 'whatsapp-send' },
      { name: 'email-send' },
    ),
    forwardRef(() => PrivacyModule),
  ],
  providers: [PdfGenerationWorker, WhatsappSendWorker, EmailSendWorker],
  exports: [BullModule],
})
export class QueueModule {}
