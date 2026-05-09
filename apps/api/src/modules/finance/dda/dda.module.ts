import { Module } from '@nestjs/common';
import { DdaController } from './dda.controller';
import { DdaService } from './dda.service';
import { DdaFactory } from './dda.factory';
import { PagBankGateway } from './gateways/pagbank.gateway';
import { MercadoPagoGateway } from './gateways/mercadopago.gateway';
import { AsaasGateway } from './gateways/asaas.gateway';

@Module({
  controllers: [DdaController],
  providers: [
    DdaService,
    DdaFactory,
    PagBankGateway,
    MercadoPagoGateway,
    AsaasGateway,
  ],
  exports: [DdaService],
})
export class DdaModule {}
