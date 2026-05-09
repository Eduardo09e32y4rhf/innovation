export interface DdaBoleto {
  id: string;
  bankId: 'PAGBANK' | 'MERCADOPAGO' | 'ASAAS';
  providerName: string;
  description: string;
  amount: number;
  dueDate: string;
  barcode: string;
  status: 'PENDING' | 'RECONCILED' | 'CANCELED';
  source: 'BOLETO' | 'PIX' | 'CARD' | 'TRANSFER';
  metadata?: Record<string, unknown>;
}

export interface DdaGateway {
  getBankName(): string;
  listBoletos(documentCpfCnpj: string, startDate?: string, endDate?: string): Promise<DdaBoleto[]>;
}
