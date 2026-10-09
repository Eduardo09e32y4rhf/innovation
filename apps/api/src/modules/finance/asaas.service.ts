import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AsaasPayment {
  refunds?: Array<{ id?: string; status: string; value: number; description?: string; transactionReceiptUrl?: string }>;
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
  transactionReceiptUrl?: string;
  externalReference?: string;
}

/** O Asaas entendeu o pedido e RECUSOU (dado inválido, valor mínimo...). Diferente de falha de rede: nada foi criado lá. */
export class AsaasRejectedException extends BadRequestException {}

interface AsaasListResponse<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
}

type AllowedBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED';
const VALID_BILLING_TYPES: AllowedBillingType[] = ['PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED'];

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

  /**
   * Retorna o tipo de cobrança padrão lido do ambiente.
   * Usa PIX quando nenhuma configuração válida for informada.
   * Não aceita valores arbitrários.
   */
  private getDefaultBillingType(): AllowedBillingType {
    const configured = (this.configService.get<string>('ASAAS_DEFAULT_BILLING_TYPE') ?? '').toUpperCase() as AllowedBillingType;
    if (!configured) return 'PIX';
    if (!VALID_BILLING_TYPES.includes(configured)) {
      this.logger.warn(`ASAAS_DEFAULT_BILLING_TYPE="${configured}" inválido. Usando PIX como padrão.`);
      return 'PIX';
    }
    return configured;
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
        // 400/404/422 com lista de erros = recusa definitiva. 401/403 (chave errada), 429 e 5xx continuam como indisponibilidade.
        if ([400, 404, 422].includes(response.status) && Array.isArray((data as any)?.errors) && message) throw new AsaasRejectedException(`Asaas recusou: ${message}`);
        throw new ServiceUnavailableException(`Asaas: ${message || 'falha na requisicao'}`);
      }
      return data as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof AsaasRejectedException) throw error;
      this.logger.error(`Falha ao se comunicar com o Asaas: ${String(error)}`);
      throw new ServiceUnavailableException('Não foi possível comunicar com o Asaas. Tente novamente.');
    }
  }

  createCustomer(data: { name: string; cpfCnpj: string; email?: string; phone?: string; mobilePhone?: string; externalReference?: string; notificationDisabled?: boolean }) {
    return this.request<{ id: string }>('/customers', { method: 'POST', body: JSON.stringify(data) });
  }

  updateCustomer(customerId: string, data: { notificationDisabled?: boolean }) {
    return this.request<{ id: string }>(`/customers/${encodeURIComponent(customerId)}`, { method: 'POST', body: JSON.stringify(data) });
  }

  createSubscription(customerId: string, data: { value: number; nextDueDate: string; description: string; cycle?: string; billingType?: AllowedBillingType }) {
    return this.request<{ id: string }>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: data.billingType ?? this.getDefaultBillingType(),
        value: data.value,
        nextDueDate: data.nextDueDate,
        cycle: data.cycle || 'MONTHLY',
        description: data.description,
      }),
    });
  }

  async createCharge(customerId: string, data: { value: number; dueDate: string; description: string; billingType?: string; externalReference?: string; successPath?: string }) {
    const callback = this.appUrl
      ? { successUrl: `${this.appUrl}${data.successPath || '/login?payment=success'}`, autoRedirect: true }
      : undefined;
    const send = (withCallback: boolean) => this.request<AsaasPayment>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: (data.billingType as AllowedBillingType | undefined) ?? this.getDefaultBillingType(),
        value: data.value,
        dueDate: data.dueDate,
        description: data.description,
        externalReference: data.externalReference,
        ...(withCallback && callback ? { callback } : {}),
      }),
    });
    try {
      return await send(true);
    } catch (error) {
      // O redirecionamento pós-pagamento só funciona com o site cadastrado na conta do Asaas (Minha Conta > Informações).
      // Sem ele, a cobrança sai igual, só que sem voltar sozinho ao sistema: não vale perder a cobrança por isso.
      if (callback && error instanceof AsaasRejectedException && /dom[ií]nio|site/i.test(error.message)) {
        this.logger.warn('Asaas sem site cadastrado: cobranca criada sem redirecionamento. Cadastre o site em Minha Conta > Informacoes.');
        return send(false);
      }
      throw error;
    }
  }

  findChargesByReference(invoiceId: string) {
    return this.request<{ data: AsaasPayment[]; hasMore: boolean }>(`/payments?externalReference=${encodeURIComponent(`inv:${invoiceId}`)}&limit=100`);
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

  refundPayment(paymentId: string, value?: number, description?: string) {
    return this.request<AsaasPayment>(`/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: 'POST',
      body: JSON.stringify({ value, description }),
    });
  }

  getPaymentsBySubscription(subscriptionId: string) {
    return this.request<AsaasListResponse<AsaasPayment>>(`/payments?subscription=${encodeURIComponent(subscriptionId)}`);
  }

  getSubscription(subscriptionId: string) {
    return this.request<{ id: string; customer: string; nextDueDate: string; status: string; billingType: string }>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
  }

  /**
   * Muda a assinatura. Com `value`, o Asaas por padrão NÃO mexe na cobrança já gerada do próximo vencimento:
   * sem `updatePendingPayments`, desconto, cupom e troca de usuários só valeriam no ciclo seguinte.
   */
  updateSubscription(subscriptionId: string, data: { value?: number; nextDueDate?: string; cycle?: string; updatePendingPayments?: boolean }) {
    const body = data.value !== undefined && data.updatePendingPayments === undefined ? { ...data, updatePendingPayments: true } : data;
    return this.request<{ id: string }>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /** Cobranças ainda não pagas geradas pela assinatura (o Asaas gera a do próximo vencimento com antecedência). */
  async listPendingSubscriptionPayments(subscriptionId: string) {
    const result = await this.request<AsaasListResponse<AsaasPayment>>(`/payments?subscription=${encodeURIComponent(subscriptionId)}&status=PENDING&limit=100`);
    return result.data ?? [];
  }

  deleteSubscription(subscriptionId: string) {
    return this.request<{ deleted: boolean }>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: 'DELETE' });
  }

  /** Linha digitável e código de barras do boleto. */
  getIdentificationField(paymentId: string) {
    return this.request<{ identificationField?: string; nossoNumero?: string; barCode?: string }>(`/payments/${encodeURIComponent(paymentId)}/identificationField`);
  }

  /** Pix copia-e-cola e QR Code da cobrança. */
  getPixQrCode(paymentId: string) {
    return this.request<{ encodedImage?: string; payload?: string; expirationDate?: string }>(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`);
  }

  /** Notas fiscais de serviço emitidas pelo Asaas para a cobrança. */
  listInvoicesByPayment(paymentId: string) {
    return this.request<AsaasListResponse<AsaasFiscalInvoice>>(`/invoices?payment=${encodeURIComponent(paymentId)}`);
  }

  getFiscalInvoice(invoiceId: string) {
    return this.request<AsaasFiscalInvoice>(`/invoices/${encodeURIComponent(invoiceId)}`);
  }

  /** Agenda a NFS-e de uma cobrança. O Asaas emite na data informada (ou na confirmação do pagamento). */
  scheduleFiscalInvoice(data: AsaasScheduleInvoiceInput) {
    return this.request<AsaasFiscalInvoice>('/invoices', { method: 'POST', body: JSON.stringify(data) });
  }

  /** Dados fiscais da conta (prefeitura, RPS, certificado). Responde 404 quando a conta ainda não configurou a emissão. */
  getFiscalInfo() {
    return this.request<{ simplesNacional?: boolean; municipalInscription?: string; rpsSerie?: string; rpsNumber?: number; email?: string }>('/fiscalInfo');
  }
}

export interface AsaasFiscalInvoice {
  id: string;
  payment?: string;
  status?: string;
  number?: string;
  series?: string;
  validationCode?: string;
  value?: number;
  effectiveDate?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  invoiceUrl?: string;
  statusDescription?: string;
}

export interface AsaasScheduleInvoiceInput {
  payment: string;
  serviceDescription: string;
  observations: string;
  value: number;
  deductions: number;
  effectiveDate: string;
  externalReference?: string;
  municipalServiceId?: string;
  municipalServiceCode?: string;
  municipalServiceName?: string;
  updatePayment?: boolean;
  taxes: { retainIss: boolean; iss: number; cofins: number; csll: number; inss: number; ir: number; pis: number };
}
