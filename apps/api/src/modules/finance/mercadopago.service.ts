import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface MercadoPagoPayment {
  transaction_amount_refunded?: number;
  id: number | string;
  status: string; // approved | pending | in_process | rejected | cancelled | refunded | charged_back | authorized
  status_detail?: string;
  transaction_amount: number;
  external_reference?: string | null;
  payment_method_id?: string;
  payment_type_id?: string;
  date_approved?: string | null;
}

export interface MercadoPagoPreference {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

export interface MercadoPagoPreapproval {
  id: string;
  status: string; // pending | authorized | paused | cancelled
  external_reference?: string | null;
  init_point?: string;
  next_payment_date?: string | null;
  auto_recurring?: { transaction_amount?: number };
}

export interface MercadoPagoAuthorizedPayment {
  id: number | string;
  preapproval_id?: string;
  status?: string;
  payment?: { id?: number | string; status?: string };
}

const API = 'https://api.mercadopago.com';

/**
 * Cliente do Mercado Pago (Checkout Pro). Só precisa de MERCADOPAGO_ACCESS_TOKEN e
 * MERCADOPAGO_WEBHOOK_SECRET para operar. Nunca devolve resposta vazia: sem token, lança erro claro.
 */
@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken: string;
  private readonly webhookSecret: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    this.accessToken = (this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN') ?? '').trim();
    this.webhookSecret = (this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET') ?? '').trim();
    this.appUrl = (this.config.get<string>('APP_URL') || this.config.get<string>('NEXT_PUBLIC_APP_URL') || this.config.get<string>('BASE_URL') || '').trim().replace(/\/$/, '');
  }

  isConfigured() {
    return this.accessToken.length > 0 && !this.accessToken.startsWith('sua_') && !this.accessToken.startsWith('your_');
  }

  hasWebhookSecret() {
    return this.webhookSecret.length > 0;
  }

  /** Tokens de teste começam com TEST-. */
  mode(): 'sandbox' | 'production' | 'unconfigured' {
    if (!this.isConfigured()) return 'unconfigured';
    // Credenciais de teste novas tambem comecam com APP_USR-: use MERCADOPAGO_SANDBOX=true para declarar o modo de teste.
    return this.accessToken.startsWith('TEST-') || this.config.get<string>('MERCADOPAGO_SANDBOX') === 'true' ? 'sandbox' : 'production';
  }

  private async request<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
    if (!this.isConfigured()) throw new ServiceUnavailableException('Mercado Pago não configurado: defina MERCADOPAGO_ACCESS_TOKEN.');
    const { idempotencyKey, ...options } = init;
    let response: Response;
    try {
      response = await fetch(`${API}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          'User-Agent': 'Innovation-RH/1.0',
          ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
          ...options.headers,
        },
      });
    } catch (error) {
      this.logger.error(`Falha de rede com o Mercado Pago: ${String(error)}`);
      throw new ServiceUnavailableException('Não foi possível comunicar com o Mercado Pago. Tente novamente.');
    }
    const data = await response.json().catch(() => null);
    if (response.status === 404) throw new NotFoundException('Mercado Pago: recurso não encontrado.');
    if (!response.ok) {
      this.logger.error(`Mercado Pago ${response.status}: ${JSON.stringify(data)}`);
      throw new ServiceUnavailableException(`Mercado Pago: ${(data as { message?: string } | null)?.message || response.statusText || 'falha na requisição'}`);
    }
    return data as T;
  }

  /** Link de pagamento (Pix, cartão, saldo MP). `externalReference` identifica nossa fatura no webhook. */
  createCheckoutPreference(input: { title: string; amount: number; externalReference: string; payerEmail?: string; successPath?: string; expiresAt?: Date }) {
    const notificationUrl = this.appUrl ? `${this.appUrl}/api/finance/webhook/mercadopago` : undefined;
    const back = (path: string) => `${this.appUrl}${path}`;
    return this.request<MercadoPagoPreference>('/checkout/preferences', {
      method: 'POST',
      idempotencyKey: `pref:${input.externalReference}`,
      body: JSON.stringify({
        items: [{ id: input.externalReference, title: input.title, quantity: 1, currency_id: 'BRL', unit_price: Number(input.amount.toFixed(2)) }],
        external_reference: input.externalReference,
        ...(input.payerEmail ? { payer: { email: input.payerEmail } } : {}),
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        ...(this.appUrl ? {
          back_urls: { success: back(input.successPath || '/login?payment=success'), pending: back('/login?payment=pending'), failure: back('/login?payment=failure') },
          auto_return: 'approved',
        } : {}),
        ...(input.expiresAt ? { expires: true, expiration_date_to: input.expiresAt.toISOString() } : {}),
      }),
    });
  }

  /**
   * Assinatura mensal (preapproval) com checkout hospedado: o cliente informa o cartao na pagina do Mercado Pago.
   * `externalReference` = `sub:<companyId>`; cada cobranca chega no webhook como subscription_authorized_payment.
   */
  createSubscription(input: { reason: string; amount: number; externalReference: string; payerEmail: string; backPath?: string }) {
    if (!this.appUrl) throw new ServiceUnavailableException('Defina APP_URL para criar assinaturas no Mercado Pago.');
    return this.request<MercadoPagoPreapproval>('/preapproval', {
      method: 'POST',
      // Chave única por chamada: após cancelar/trocar de plano, a mesma empresa e valor precisam gerar uma assinatura nova.
      idempotencyKey: `sub:${input.externalReference}:${input.amount.toFixed(2)}:${crypto.randomUUID()}`,
      body: JSON.stringify({
        reason: input.reason,
        external_reference: input.externalReference,
        payer_email: input.payerEmail,
        back_url: `${this.appUrl}${input.backPath || '/login?payment=success'}`,
        status: 'pending',
        auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: Number(input.amount.toFixed(2)), currency_id: 'BRL' },
      }),
    });
  }

  getPreapproval(id: string) {
    return this.request<MercadoPagoPreapproval>(`/preapproval/${encodeURIComponent(id)}`);
  }

  getAuthorizedPayment(id: string | number) {
    return this.request<MercadoPagoAuthorizedPayment>(`/authorized_payments/${encodeURIComponent(String(id))}`);
  }

  /** Muda o valor das proximas cobrancas (troca de plano ou de usuarios). */
  updateSubscriptionAmount(id: string, amount: number) {
    return this.request<MercadoPagoPreapproval>(`/preapproval/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ auto_recurring: { transaction_amount: Number(amount.toFixed(2)), currency_id: 'BRL' } }),
    });
  }

  cancelSubscription(id: string) {
    return this.request<MercadoPagoPreapproval>(`/preapproval/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) });
  }

  getPayment(paymentId: string | number) {
    return this.request<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(String(paymentId))}`);
  }

  /** Pagamento mais relevante da fatura (aprovado primeiro). Útil quando o webhook ainda não chegou. */
  async findPaymentForInvoice(invoiceId: string, knownPaymentId?: string | null): Promise<MercadoPagoPayment | null> {
    if (knownPaymentId) return this.getPayment(knownPaymentId);
    const result = await this.request<{ results?: MercadoPagoPayment[] }>(`/v1/payments/search?external_reference=${encodeURIComponent(`inv:${invoiceId}`)}&sort=date_created&criteria=desc`);
    const list = result.results ?? [];
    return list.find((p) => p.status === 'approved') ?? list[0] ?? null;
  }

  getRefunds(paymentId: string | number) {
    return this.request<Array<{ id: number; status: string; amount: number; description?: string }>>(`/v1/payments/${encodeURIComponent(String(paymentId))}/refunds`);
  }

  refund(paymentId: string | number, amount?: number, operationId?: string) {
    return this.request<{ id: number; status: string }>(`/v1/payments/${encodeURIComponent(String(paymentId))}/refunds`, {
      method: 'POST',
      idempotencyKey: operationId || `refund:${paymentId}:${amount ?? 'full'}`,
      body: JSON.stringify(amount ? { amount } : {}),
    });
  }

  /** Teste de credencial para o painel de integrações. */
  async ping(): Promise<{ ok: boolean; accountId?: number; error?: string }> {
    try {
      const me = await this.request<{ id: number }>('/users/me');
      return { ok: true, accountId: me.id };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Valida o cabeçalho x-signature (ts=...,v1=...) do webhook.
   * Manifesto: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
   */
  verifySignature(input: { signature?: string; requestId?: string; dataId?: string }): boolean {
    if (!this.webhookSecret || !input.signature) return false;
    const parts = Object.fromEntries(input.signature.split(',').map((p) => p.trim().split('=') as [string, string]));
    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) return false;
    const manifest = `${input.dataId ? `id:${String(input.dataId).toLowerCase()};` : ''}${input.requestId ? `request-id:${input.requestId};` : ''}ts:${ts};`;
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(manifest).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(v1);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  mapStatus(status?: string): 'PAID' | 'OPEN' | 'CANCELED' {
    if (status === 'approved') return 'PAID';
    // rejected/cancelled são tentativas que falharam: a fatura continua em aberto para nova tentativa.
    if (['refunded', 'charged_back'].includes(status ?? '')) return 'CANCELED';
    return 'OPEN';
  }
}
