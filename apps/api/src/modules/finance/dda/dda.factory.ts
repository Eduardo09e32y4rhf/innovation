import { Injectable, BadRequestException } from '@nestjs/common';
import { DdaGateway } from './interfaces/dda-gateway.interface';
import { PagBankGateway } from './gateways/pagbank.gateway';
import { MercadoPagoGateway } from './gateways/mercadopago.gateway';
import { AsaasGateway } from './gateways/asaas.gateway';

export type SupportedBank = 'PAGBANK' | 'MERCADOPAGO' | 'ASAAS';

export const SUPPORTED_DDA_BANKS: SupportedBank[] = ['MERCADOPAGO', 'PAGBANK', 'ASAAS'];

@Injectable()
export class DdaFactory {
  constructor(
    private readonly pagBankGateway: PagBankGateway,
    private readonly mercadoPagoGateway: MercadoPagoGateway,
    private readonly asaasGateway: AsaasGateway,
  ) {}

  listSupportedBanks() {
    return SUPPORTED_DDA_BANKS;
  }

  getGateway(bank: SupportedBank): DdaGateway {
    switch (bank) {
      case 'PAGBANK':
        return this.pagBankGateway;
      case 'MERCADOPAGO':
        return this.mercadoPagoGateway;
      case 'ASAAS':
        return this.asaasGateway;
      default:
        throw new BadRequestException(`Bank ${bank} is not supported for DDA.`);
    }
  }
}
