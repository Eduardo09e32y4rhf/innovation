import { Injectable, Logger } from '@nestjs/common';
import { DdaGateway, DdaBoleto } from '../interfaces/dda-gateway.interface';

@Injectable()
export class PagBankGateway implements DdaGateway {
  private readonly logger = new Logger(PagBankGateway.name);

  getBankName(): string {
    return 'PAGBANK';
  }

  async listBoletos(documentCpfCnpj: string, startDate?: string, endDate?: string): Promise<DdaBoleto[]> {
    this.logger.log(`Listing DDA Boletos from PagBank for document ${documentCpfCnpj}`);
    return [
      {
        id: 'PAG-001',
        bankId: 'PAGBANK',
        providerName: 'PagBank',
        description: 'Venda licença adicional',
        amount: 2200,
        dueDate: '2026-05-15',
        barcode: '23790000000002200000123456789012345678901234',
        status: 'PENDING',
        source: 'PIX',
        metadata: { documentCpfCnpj, startDate, endDate },
      },
    ];
  }
}
