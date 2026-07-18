import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string;
  status?: string;
  value: number;
  dueDate: string;
  billingType?: string;
  description?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  paymentLink?: string;
  checkoutUrl?: string;
  externalReference?: string;
}

interface AsaasListResponse<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
}

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ASAAS_API_KEY')?.trim() || '';
    const configuredUrl = this.configService.get<string>('ASAAS_API_URL')?.trim();
    const defaultUrl = this.resolveDefaultApiUrl(this.apiKey);
    this.apiUrl = (configuredUrl || defaultUrl).replace(/\/$/, '');
    this.appUrl = (this.configService.get<string>('APP_URL') || this.configService.get<string>('NEXT_PUBLIC_APP_URL') || this.configService.get<string>('BASE_URL') || '').trim().replace(/\/$/, '');
  }

  isConfigured() {
    return this.apiKey.length > 0 && !this.apiKey.startsWith('sua_chave_') && !this.apiKey.startsWith('your_');
  }

  private resolveDefaultApiUrl(apiKey: string) {
    const normalized = apiKey.toLowerCase();
    if (normalized.includes('hmlg') || normalized.includes('sandbox')) return 'https://api-sandbox.asaas.com/v3';
    return process.env.NODE_ENV === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    if (!this.apiKey) {
      this.logger.warn(`Asaas nao configurado: ${options.method || 'GET'} ${endpoint}`);
      return {} as T;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          access_token: this.apiKey,
          'User-Agent': 'Innovation-RH/1.0',
          ...options.headers,
        },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray((data as any)?.errors)
          ? (data as any).errors.map((item: any) => item.description).filter(Boolean).join('; ')
          : response.statusText;
        this.logger.error(`Asaas ${response.status}: ${JSON.stringify(data)}`);
        throw new ServiceUnavailableException(`Asaas: ${message || 'falha na requisicao'}`);
      }
      return data as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`Falha ao se comunicar com o Asaas: ${String(error)}`);
      throw new ServiceUnavailableException('Nao foi possivel comunicar com o Asaas. Tente novamente.');
    }
  }

  createCustomer(data: { name: string; cpfCnpj: string; email?: string; phone?: string }) {
    return this.request<{ id: string }>('/customers', { method: 'POST', body: JSON.stringify(data) });
  }

  createSubscription(customerId: string, data: { value: number; nextDueDate: string; description: string; cycle?: string }) {
    return this.request<{ id: string }>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED',
        value: data.value,
        nextDueDate: data.nextDueDate,
        cycle: data.cycle || 'MONTHLY',
        description: data.description,
      }),
    });
  }

  createCharge(customerId: string, data: { value: number; dueDate: string; description: string; billingType?: string; externalReference?: string; successPath?: string }) {
    const callback = this.appUrl
      ? { successUrl: `${this.appUrl}${data.successPath || '/login?payment=success'}`, autoRedirect: true }
      : undefined;
    return this.request<AsaasPayment>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: data.billingType || 'UNDEFINED',
        value: data.value,
        dueDate: data.dueDate,
        description: data.description,
        externalReference: data.externalReference,
        ...(callback ? { callback } : {}),
      }),
    });
  }

  getCharge(paymentId: string) {
    return this.request<AsaasPayment>(`/payments/${encodeURIComponent(paymentId)}`);
  }

  updateCharge(paymentId: string, data: Record<string, unknown>) {
    return this.request<AsaasPayment>(`/payments/${encodeURIComponent(paymentId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteCharge(paymentId: string) {
    return this.request<{ deleted: boolean }>(`/payments/${encodeURIComponent(paymentId)}`, { method: 'DELETE' });
  }

  getPaymentsBySubscription(subscriptionId: string) {
    return this.request<AsaasListResponse<AsaasPayment>>(`/payments?subscription=${encodeURIComponent(subscriptionId)}`);
  }
}