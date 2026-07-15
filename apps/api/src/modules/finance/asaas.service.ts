import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3';
    this.apiKey = this.configService.get<string>('ASAAS_API_KEY') || '';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    
    if (!this.apiKey) {
      this.logger.warn(`Simulando chamada para Asaas API (Sem API Key): ${options.method || 'GET'} ${url}`);
      return {} as T;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'access_token': this.apiKey,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        this.logger.error(`Erro na API do Asaas: ${response.status} - ${JSON.stringify(errorData)}`);
        throw new Error(`Asaas API error: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      this.logger.error(`Falha ao se comunicar com o Asaas: ${error}`);
      throw error;
    }
  }

  async createCustomer(data: { name: string; cpfCnpj: string; email?: string; phone?: string }) {
    this.logger.log(`Criando cliente no Asaas para: ${data.name}`);
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createSubscription(customerId: string, data: { value: number; nextDueDate: string; description: string; cycle?: string }) {
    this.logger.log(`Criando assinatura no Asaas para o cliente: ${customerId}`);
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED', // Deixa o cliente escolher PIX/Boleto/Cartao
        value: data.value,
        nextDueDate: data.nextDueDate,
        cycle: data.cycle || 'MONTHLY',
        description: data.description,
      }),
    });
  }

  async createCharge(customerId: string, data: { value: number; dueDate: string; description: string }) {
    this.logger.log(`Criando cobrança avulsa no Asaas para o cliente: ${customerId}`);
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED',
        value: data.value,
        dueDate: data.dueDate,
        description: data.description,
      }),
    });
  }

  async getPaymentsBySubscription(subscriptionId: string) {
    this.logger.log(`Buscando pagamentos da assinatura: ${subscriptionId}`);
    return this.request(`/payments?subscription=${subscriptionId}`, {
      method: 'GET',
    });
  }
}
