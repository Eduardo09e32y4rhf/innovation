import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AsaasService } from './asaas.service';
import { AsaasWebhookController } from './asaas-webhook.controller';
import { AsaasWebhookProcessorService, AsaasWebhookWorker } from './asaas-webhook.processor';
import { BillingCronService } from './billing-cron.service';
import { CompanyBillingController } from './company-billing.controller';
import { FinanceController } from './finance.controller';
import { FinanceNotificationService } from './finance-notification.service';
import { PlatformFinanceService } from './platform-finance.service';
import { PricingService } from './pricing.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    forwardRef(() => QueueModule),
    BullModule.registerQueue(
      { name: 'whatsapp-send' },
      { name: 'asaas-webhook' },
    ),
  ],
  providers: [
    AsaasService,
    AsaasWebhookProcessorService,
    AsaasWebhookWorker,
    BillingCronService,
    PlatformFinanceService,
    FinanceNotificationService,
    PricingService,
  ],
  controllers: [
    FinanceController,
    CompanyBillingController,
    AsaasWebhookController,
  ],
  exports: [AsaasService, PlatformFinanceService, FinanceNotificationService, PricingService],
})
export class FinanceModule {}
