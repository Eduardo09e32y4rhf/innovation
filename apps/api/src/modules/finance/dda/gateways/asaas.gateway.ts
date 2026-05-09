import { Injectable, Logger } from '@nestjs/common';
import { DdaGateway, DdaBoleto } from '../interfaces/dda-gateway.interface';

@Injectable()
export class AsaasGateway implements DdaGateway {
  private readonly logger = new Logger(AsaasGateway.name);

  getBankName(): string {
    return 'ASAAS';
  }

  async listBoletos(documentCpfCnpj: string, startDate?: string, endDate?: string): Promise<DdaBoleto[]> {
    this.logger.log(`Listing DDA Boletos from Asaas for document ${documentCpfCnpj}`);
    return [
      {
        id: 'ASAAS-001',
        bankId: 'ASAAS',
        providerName: 'Asaas',
        description: 'Boleto Cliente Alpha',
        amount: 12800,
        dueDate: '2026-05-10',
        barcode: '00190000000012800000123456789012345678901234',
        status: 'PENDING',
        source: 'BOLETO',
        metadata: { documentCpfCnpj, startDate, endDate },
      },
      {
        id: 'ASAAS-002',
        bankId: 'ASAAS',
        providerName: 'Asaas',
        description: 'Consultoria estratégica',
        amount: 3500,
        dueDate: '2026-05-20',
        barcode: '00190000000003500000123456789012345678901234',
        status: 'RECONCILED',
        source: 'BOLETO',
        metadata: { documentCpfCnpj, startDate, endDate },
      },
    ];
  }
}
