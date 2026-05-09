import { Injectable, Logger } from '@nestjs/common';
import { DdaGateway, DdaBoleto } from '../interfaces/dda-gateway.interface';

@Injectable()
export class MercadoPagoGateway implements DdaGateway {
  private readonly logger = new Logger(MercadoPagoGateway.name);

  getBankName(): string {
    return 'MERCADOPAGO';
  }

  async listBoletos(documentCpfCnpj: string, startDate?: string, endDate?: string): Promise<DdaBoleto[]> {
    this.logger.log(`Listing DDA Boletos from Mercado Pago for document ${documentCpfCnpj}`);
    return [
      {
        id: 'MP-001',
        bankId: 'MERCADOPAGO',
        providerName: 'Mercado Pago',
        description: 'Recebível cartão - Plano Pro',
        amount: 4900,
        dueDate: '2026-05-12',
        barcode: '34190000000004900000123456789012345678901234',
        status: 'RECONCILED',
        source: 'CARD',
        metadata: { documentCpfCnpj, startDate, endDate },
      },
    ];
  }
}
