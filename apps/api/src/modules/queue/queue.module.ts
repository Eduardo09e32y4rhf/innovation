import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PdfGenerationWorker } from './workers/pdf-generation.worker';
import { WhatsappSendWorker } from './workers/whatsapp-send.worker';
import { EmailSendWorker } from './workers/email-send.worker';
import { PrivacyModule } from '../privacy/privacy.module';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
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
