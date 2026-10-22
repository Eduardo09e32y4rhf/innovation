import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { PublicSupportController } from './public-support.controller';
import { PlatformSupportController } from './platform-support.controller';
import { SupportRepository } from './support.repository';
import { SupportAuthorizationService } from './support-authorization.service';
import { SupportSlaService } from './support-sla.service';
import { SupportSlaScheduler } from './support-sla.scheduler';
import { SupportAttachmentService } from './support-attachment.service';
import { SupportFileValidationService } from './support-file-validation.service';
import { LocalSupportStorageService } from './local-support-storage.service';
import { SupportStorageService } from './support-storage.service';
import { SupportNotificationService } from './support-notification.service';
import { SupportRefundService } from './support-refund.service';
import { SupportSatisfactionService } from './support-satisfaction.service';
import { SupportDuplicateService } from './support-duplicate.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SupportController, PublicSupportController, PlatformSupportController],
  providers: [
    SupportService,
    SupportRepository,
    SupportAuthorizationService,
    SupportSlaService,
    SupportSlaScheduler,
    SupportAttachmentService,
    SupportFileValidationService,
    SupportNotificationService,
    SupportRefundService,
    SupportSatisfactionService,
    SupportDuplicateService,
    LocalSupportStorageService,
    { provide: SupportStorageService, useClass: LocalSupportStorageService }
  ],
  exports: [SupportService, SupportStorageService]
})
export class SupportModule {}
