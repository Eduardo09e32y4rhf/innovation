import { Module } from '@nestjs/common';
import { AsaasService } from './asaas.service';
import { AsaasWebhookController } from './asaas-webhook.controller';
import { BillingCronService } from './billing-cron.service';
import { FinanceController } from './finance.controller';
import { PlatformFinanceService } from './platform-finance.service';

@Module({
  providers: [AsaasService, BillingCronService, PlatformFinanceService],
  controllers: [FinanceController, AsaasWebhookController],
  exports: [AsaasService, PlatformFinanceService],
})
export class FinanceModule {}