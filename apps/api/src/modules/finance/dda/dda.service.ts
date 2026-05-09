import { Injectable } from '@nestjs/common';
import { DdaFactory, SupportedBank } from './dda.factory';
import { DdaBoleto } from './interfaces/dda-gateway.interface';

type DdaProviderStatus = {
  id: SupportedBank;
  name: string;
  initials: string;
  connected: boolean;
  balance: number;
  scope: string;
  lastSyncAt: string | null;
};

@Injectable()
export class DdaService {
  private readonly reconciled = new Set<string>(['MP-001', 'ASAAS-002']);
  private readonly connectedProviders = new Set<SupportedBank>(['MERCADOPAGO']);
  private lastSyncAt = new Date().toISOString();

  constructor(private readonly ddaFactory: DdaFactory) {}

  listProviders(): DdaProviderStatus[] {
    const metadata: Record<SupportedBank, Omit<DdaProviderStatus, 'id' | 'connected' | 'lastSyncAt'>> = {
      MERCADOPAGO: { name: 'Mercado Pago', initials: 'MP', balance: 28420, scope: 'Extrato e recebíveis' },
      PAGBANK: { name: 'PagBank', initials: 'PB', balance: 0, scope: 'Extrato e conciliação' },
      ASAAS: { name: 'Asaas', initials: 'AS', balance: 0, scope: 'Cobranças e boletos' },
    };

    return this.ddaFactory.listSupportedBanks().map((id) => ({
      id,
      ...metadata[id],
      connected: this.connectedProviders.has(id),
      lastSyncAt: this.connectedProviders.has(id) ? this.lastSyncAt : null,
    }));
  }

  connectProvider(bank: SupportedBank) {
    this.ddaFactory.getGateway(bank);
    this.connectedProviders.add(bank);
    this.lastSyncAt = new Date().toISOString();
    return this.listProviders().find((provider) => provider.id === bank);
  }

  async listBoletos(bank?: SupportedBank, documentCpfCnpj = '00000000000100', startDate?: string, endDate?: string): Promise<DdaBoleto[]> {
    const banks = bank ? [bank] : this.ddaFactory.listSupportedBanks();
    const all = await Promise.all(
      banks.map((currentBank) => this.ddaFactory.getGateway(currentBank).listBoletos(documentCpfCnpj, startDate, endDate)),
    );

    return all
      .flat()
      .map((boleto) => ({
        ...boleto,
        status: this.reconciled.has(boleto.id) ? 'RECONCILED' : boleto.status,
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  async reconcileBoleto(bank: SupportedBank, boletoId: string) {
    const boleto = (await this.listBoletos(bank)).find((item) => item.id === boletoId);
    if (!boleto) {
      return { id: boletoId, bankId: bank, status: 'RECONCILED' as const, reconciledAt: new Date().toISOString() };
    }

    this.reconciled.add(boleto.id);
    return { ...boleto, status: 'RECONCILED' as const, reconciledAt: new Date().toISOString() };
  }
}
