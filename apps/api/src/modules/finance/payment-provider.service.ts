import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AsaasService } from './asaas.service';
import { MercadoPagoService } from './mercadopago.service';

export type PaymentProviderName = 'ASAAS' | 'MERCADOPAGO';
const SETTING_KEY = 'billing.provider';
const PROVIDERS: PaymentProviderName[] = ['ASAAS', 'MERCADOPAGO'];

/** Decide qual provedor cobra. Prioridade: configuração gravada no painel > PAYMENT_PROVIDER > ASAAS. */
@Injectable()
export class PaymentProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
    private readonly mercadoPago: MercadoPagoService,
  ) {}

  private normalize(value: unknown): PaymentProviderName | null {
    const text = String(value ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (text === 'MERCADOPAGO' || text === 'MP' || text === 'MERCADOLIVRE') return 'MERCADOPAGO';
    if (text === 'ASAAS') return 'ASAAS';
    return null;
  }

  async active(): Promise<PaymentProviderName> {
    const stored = await this.prisma.platformSetting.findUnique({ where: { key: SETTING_KEY } }).catch(() => null);
    return this.normalize((stored?.value as { provider?: string } | null)?.provider) ?? this.normalize(process.env.PAYMENT_PROVIDER) ?? 'ASAAS';
  }

  async setActive(provider: string, actorId?: string) {
    const normalized = this.normalize(provider);
    if (!normalized || !PROVIDERS.includes(normalized)) throw new BadRequestException('Provedor inválido. Use ASAAS ou MERCADOPAGO.');
    const ready = normalized === 'ASAAS' ? this.asaas.isConfigured() : this.mercadoPago.isConfigured() && this.mercadoPago.hasWebhookSecret();
    if (!ready) throw new BadRequestException(`Configure as credenciais de ${normalized === 'ASAAS' ? 'Asaas' : 'Mercado Pago'} antes de ativá-lo.`);
    await this.prisma.platformSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: { provider: normalized }, updatedBy: actorId ?? null },
      update: { value: { provider: normalized }, updatedBy: actorId ?? null },
    });
    return { provider: normalized };
  }

  async health(options: { ping?: boolean } = {}) {
    const [active, mpPing] = await Promise.all([
      this.active(),
      options.ping && this.mercadoPago.isConfigured() ? this.mercadoPago.ping() : Promise.resolve(null),
    ]);
    return {
      active,
      providers: {
        ASAAS: {
          configured: this.asaas.isConfigured(),
          mode: !this.asaas.isConfigured() ? 'unconfigured' : (process.env.ASAAS_API_KEY ?? '').toLowerCase().includes('hmlg') || (process.env.ASAAS_API_URL ?? '').includes('sandbox') ? 'sandbox' : 'production',
          webhookSecret: Boolean(process.env.ASAAS_WEBHOOK_TOKEN || process.env.ASAAS_WEBHOOK_SECRET),
          webhookPath: '/api/finance/webhook/asaas',
          requiredEnv: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_TOKEN'],
        },
        MERCADOPAGO: {
          configured: this.mercadoPago.isConfigured(),
          mode: this.mercadoPago.mode(),
          webhookSecret: this.mercadoPago.hasWebhookSecret(),
          webhookPath: '/api/finance/webhook/mercadopago',
          requiredEnv: ['MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_WEBHOOK_SECRET'],
          ...(mpPing ? { connection: mpPing } : {}),
        },
      },
    };
  }
}
