import { Module } from '@nestjs/common';
import { AsaasService } from './asaas.service';
import { BillingCronService } from './billing-cron.service';
import { FinanceController } from './finance.controller';
import { AsaasWebhookController } from './asaas-webhook.controller';

@Module({
  providers: [AsaasService, BillingCronService],
  controllers: [FinanceController, AsaasWebhookController],
  exports: [AsaasService],
})
export class FinanceModule {}
