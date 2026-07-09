import { Module } from '@nestjs/common';
import { AsaasService } from './asaas.service';
import { BillingCronService } from './billing-cron.service';
import { FinanceController } from './finance.controller';

@Module({
  providers: [AsaasService, BillingCronService],
  controllers: [FinanceController],
  exports: [AsaasService],
})
export class FinanceModule {}
