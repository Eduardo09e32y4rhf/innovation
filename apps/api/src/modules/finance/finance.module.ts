import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AsaasService } from './asaas.service';
import { AsaasWebhookController } from './asaas-webhook.controller';
import { AsaasWebhookProcessorService, AsaasWebhookWorker } from './asaas-webhook.processor';
import { BillingCronService } from './billing-cron.service';
import { CompanyBillingController } from './company-billing.controller';
import { FaturasAcoesService } from './faturas-acoes.service';
import { FaturasEmpresaService } from './faturas-empresa.service';
import { FaturasController } from './faturas.controller';
import { FaturasPermissoesController } from './faturas-permissoes.controller';
import { FaturasPermissionsService } from '../../common/permissions/faturas-permissions.service';
import { FaturasService } from './faturas.service';
import { FinanceController } from './finance.controller';
import { IntegrationsController } from './integrations.controller';
import { MercadoPagoService } from './mercadopago.service';
import { MercadoPagoWebhookController } from './mercadopago-webhook.controller';
import { PaymentProviderService } from './payment-provider.service';
import { FinanceNotificationService } from './finance-notification.service';
import { PlatformFinanceService } from './platform-finance.service';
import { PricingService } from './pricing.service';
import { QueueModule } from '../queue/queue.module';
import { TimeTrackModule } from '../time-track/time-track.module';

@Module({
  imports: [
    TimeTrackModule,
    forwardRef(() => QueueModule),
    BullModule.registerQueue(
      { name: 'whatsapp-send' },
      { name: 'asaas-webhook' },
    ),
  ],
  providers: [
    AsaasService,
    MercadoPagoService,
    PaymentProviderService,
    AsaasWebhookProcessorService,
    AsaasWebhookWorker,
    BillingCronService,
    PlatformFinanceService,
    FinanceNotificationService,
    PricingService,
    FaturasService,
    FaturasAcoesService,
    FaturasEmpresaService,
    FaturasPermissionsService,
  ],
  controllers: [
    FinanceController,
    FaturasController,
    FaturasPermissoesController,
    CompanyBillingController,
    AsaasWebhookController,
    MercadoPagoWebhookController,
    IntegrationsController,
  ],
  exports: [AsaasService, MercadoPagoService, PaymentProviderService, PlatformFinanceService, FinanceNotificationService, PricingService],
})
export class FinanceModule {}
