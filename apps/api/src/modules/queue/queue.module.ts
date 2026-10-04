import { redisConnection } from '../../common/redis/redis-config';
import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PdfGenerationWorker } from './workers/pdf-generation.worker';
import { WhatsappSendWorker } from './workers/whatsapp-send.worker';
import { EmailSendWorker } from './workers/email-send.worker';
import { PrivacyModule } from '../privacy/privacy.module';
import { CommunicationModule } from '../communication/communication.module';

@Module({
  imports: [
    BullModule.forRoot({
      redis: redisConnection(),
    }),
    BullModule.registerQueue(
      { name: 'pdf-generation' },
      { name: 'whatsapp-send' },
      { name: 'email-send' },
    ),
    forwardRef(() => PrivacyModule),
    forwardRef(() => CommunicationModule),
  ],
  providers: [PdfGenerationWorker, WhatsappSendWorker, EmailSendWorker],
  exports: [BullModule],
})
export class QueueModule {}
