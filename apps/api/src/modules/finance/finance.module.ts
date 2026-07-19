import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AsaasService } from './asaas.service';
import { AsaasWebhookController } from './asaas-webhook.controller';
import { BillingCronService } from './billing-cron.service';
import { CompanyBillingController } from './company-billing.controller';
import { FinanceController } from './finance.controller';
import { FinanceNotificationService } from './finance-notification.service';
import { PlatformFinanceService } from './platform-finance.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    forwardRef(() => QueueModule),
    BullModule.registerQueue({ name: 'whatsapp-send' }),
  ],
  providers: [
    AsaasService,
    BillingCronService,
    PlatformFinanceService,
    FinanceNotificationService,
  ],
  controllers: [
    FinanceController,
    CompanyBillingController,
    AsaasWebhookController,
  ],
  exports: [AsaasService, PlatformFinanceService, FinanceNotificationService],
})
export class FinanceModule {}