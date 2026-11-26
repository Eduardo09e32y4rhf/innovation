import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { CommercialEmailController } from './commercial-email.controller';
import { CommercialEmailProcessor } from './commercial-email.processor';
import { CommercialEmailService } from './commercial-email.service';
import { PlatformAuditModule } from '../platform-audit/platform-audit.module';

@Module({
  imports: [PlatformAuditModule, BullModule.registerQueue({ name: 'commercial-email', limiter: { max: 3, duration: 1000 } })],
  controllers: [CommercialEmailController],
  providers: [CommercialEmailService, CommercialEmailProcessor],
  exports: [CommercialEmailService],
})
export class CommercialEmailModule {}
