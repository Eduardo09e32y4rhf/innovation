import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { FinanceMessageSender } from './finance-message-sender.abstract';

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export type FinanceNotificationType =
  | 'CHARGE_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_CANCELED'
  | 'PAYMENT_REFUNDED'
  | 'INVOICE_AUTHORIZED'
  | 'INVOICE_CANCELED';

export interface FinanceNotificationInput {
  companyId: string;
  paymentId?: string;
  invoiceId?: string;
  type: FinanceNotificationType;
  amount?: number;
  dueDate?: Date;
  paidAt?: Date;
  billingType?: string;
  paymentUrl?: string;
  invoiceNumber?: string;
  fiscalPdfUrl?: string;
  fiscalXmlUrl?: string;
}

type NotifChannel = 'INTERNAL' | 'WHATSAPP' | 'EMAIL';
type NotifStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

// ─── Helpers de formatação ────────────────────────────────────────────────────

function formatBRL(value?: number): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(date?: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('pt-BR');
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// ─── Modelos de mensagem ──────────────────────────────────────────────────────

function buildMessage(type: FinanceNotificationType, input: FinanceNotificationInput, recipientName: string): string {
  const valor = formatBRL(input.amount);
  const vencimento = formatDate(input.dueDate);
  const forma = input.billingType === 'PIX' ? 'Pix' : input.billingType === 'BOLETO' ? 'Boleto' : input.billingType === 'CREDIT_CARD' ? 'Cartão de crédito' : 'Pix/Boleto';

  switch (type) {
    case 'CHARGE_CREATED':
      return (
        `Olá, ${recipientName}.\n\n` +
        `Sua mensalidade do Innovation RH foi gerada.\n\n` +
        `Valor: ${valor}\n` +
        `Vencimento: ${vencimento}\n` +
        `Forma de pagamento: ${forma}\n\n` +
        `Acesse o Financeiro do Innovation RH para visualizar ou pagar a cobrança.`
      );

    case 'PAYMENT_CONFIRMED':
      return (
        `Olá, ${recipientName}.\n\n` +
        `Recebemos o pagamento da mensalidade do Innovation RH.\n\n` +
        `Valor: ${valor}\n` +
        `Pagamento confirmado em: ${formatDate(input.paidAt ?? new Date())}\n\n` +
        `Obrigado!`
      );

    case 'PAYMENT_OVERDUE':
      return (
        `Olá, ${recipientName}.\n\n` +
        `Identificamos uma mensalidade vencida no Innovation RH.\n\n` +
        `Valor: ${valor}\n` +
        `Vencimento: ${vencimento}\n\n` +
        `Regularize pela área Financeira para evitar restrições de acesso.`
      );

    case 'PAYMENT_CANCELED':
    case 'PAYMENT_REFUNDED':
      return (
        `Olá, ${recipientName}.\n\n` +
        `O pagamento da mensalidade do Innovation RH foi cancelado ou estornado.\n\n` +
        `Valor: ${valor}\n\n` +
        `Consulte a área Financeira ou entre em contato com o suporte.`
      );

    case 'INVOICE_AUTHORIZED':
      return (
        `Olá, ${recipientName}.\n\n` +
        `A nota fiscal referente à mensalidade do Innovation RH já está disponível.\n\n` +
        (input.invoiceNumber ? `Nota: ${input.invoiceNumber}\n` : '') +
        `Valor: ${valor}\n\n` +
        `Você pode baixar o PDF e o XML pela área Financeira.`
      );

    case 'INVOICE_CANCELED':
      return (
        `Olá, ${recipientName}.\n\n` +
        `A nota fiscal referente à mensalidade do Innovation RH foi cancelada.\n\n` +
        `Valor: ${valor}\n\n` +
        `Em caso de dúvidas, entre em contato com o suporte.`
      );

    default:
      return `Olá, ${recipientName}. Temos uma atualização sobre sua mensalidade do Innovation RH. Acesse a área Financeira para mais detalhes.`;
  }
}

function buildTitle(type: FinanceNotificationType): string {
  const titles: Record<FinanceNotificationType, string> = {
    CHARGE_CREATED: 'Nova cobrança gerada',
    PAYMENT_CONFIRMED: 'Pagamento confirmado',
    PAYMENT_OVERDUE: 'Mensalidade vencida',
    PAYMENT_CANCELED: 'Pagamento cancelado',
    PAYMENT_REFUNDED: 'Pagamento estornado',
    INVOICE_AUTHORIZED: 'Nota fiscal emitida',
    INVOICE_CANCELED: 'Nota fiscal cancelada',
  };
  return titles[type] ?? 'Atualização financeira';
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class FinanceNotificationService {
  private readonly logger = new Logger(FinanceNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @InjectQueue('whatsapp-send') private readonly whatsappQueue: Queue | null,
    @Optional() private readonly messageSender: FinanceMessageSender | null,
  ) {}

  async notify(input: FinanceNotificationInput): Promise<void> {
    this.logger.log(`Notificação financeira [${input.type}] para empresa ${input.companyId}`);

    await Promise.allSettled([
      this.createInternalNotification(input).catch(err =>
        this.logger.error(`Falha na notificação interna: ${err instanceof Error ? err.message : String(err)}`),
      ),
      this.sendWhatsappNotification(input).catch(err =>
        this.logger.error(`Falha no WhatsApp financeiro: ${err instanceof Error ? err.message : String(err)}`),
      ),
    ]);
  }

  // ─── Notificação Interna ─────────────────────────────────────────────────────

  private async createInternalNotification(input: FinanceNotificationInput): Promise<void> {
    const config = await this.getConfig(input.companyId);

    if (!config.notificationsEnabled || !config.internalNotificationsEnabled) {
      await this.logNotif(input, 'INTERNAL', 'SKIPPED', undefined, 'Notificações internas desabilitadas');
      return;
    }

    if (!this.shouldNotifyType(config, input.type)) {
      await this.logNotif(input, 'INTERNAL', 'SKIPPED', undefined, 'Tipo de evento desabilitado');
      return;
    }

    const key = this.idempotencyKey(input, 'INTERNAL');
    if (await this.alreadySent(key)) return;

    await this.logNotif(input, 'INTERNAL', 'PENDING', undefined);

    try {
      const company = await this.prisma.company.findUnique({
        where: { id: input.companyId },
        select: { id: true, name: true },
      });
      if (!company) throw new Error('Empresa não encontrada');

      const title = buildTitle(input.type);
      const body = buildMessage(input.type, input, company.name);

      // Cria notificação interna para todos os ADMINs/RHs da empresa
      const admins = await this.prisma.user.findMany({
        where: {
          companyId: input.companyId,
          isActive: true,
          role: { in: ['ADMIN', 'RH'] as any },
        },
        select: { id: true },
      });

      if (admins.length > 0) {
        const notification = await this.prisma.notification.create({
          data: {
            companyId: input.companyId,
            title,
            message: body,
            type: 'PLATFORM_NOTICE' as any,
            priority: input.type === 'PAYMENT_OVERDUE' ? 'HIGH' : 'NORMAL' as any,
            status: 'SENT' as any,
            source: 'FINANCE',
            extraJson: {
              financeEventType: input.type,
              paymentId: input.paymentId,
              invoiceId: input.invoiceId,
              amount: input.amount,
            },
            createdBy: null,
            recipients: {
              create: admins.map((u: { id: string }) => ({ userId: u.id, status: 'UNREAD' as any })),
            },
          } as any,
        });
        await this.logNotif(input, 'INTERNAL', 'SENT', notification.id);
      } else {
        await this.logNotif(input, 'INTERNAL', 'SKIPPED', undefined, 'Nenhum admin encontrado');
      }
    } catch (err) {
      await this.logNotif(input, 'INTERNAL', 'FAILED', undefined, err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  // ─── Notificação WhatsApp ────────────────────────────────────────────────────

  private async sendWhatsappNotification(input: FinanceNotificationInput): Promise<void> {
    const globalEnabled = process.env.FINANCE_WHATSAPP_NOTIFICATIONS_ENABLED !== 'false'
      ? process.env.FINANCE_WHATSAPP_NOTIFICATIONS_ENABLED === 'true'
      : false;

    if (!globalEnabled) return;

    const config = await this.getConfig(input.companyId);

    if (!config.whatsappNotificationsEnabled) {
      await this.logNotif(input, 'WHATSAPP', 'SKIPPED', undefined, 'WhatsApp desabilitado para esta empresa');
      return;
    }

    if (!this.shouldNotifyType(config, input.type)) {
      await this.logNotif(input, 'WHATSAPP', 'SKIPPED', undefined, 'Tipo de evento desabilitado');
      return;
    }

    // Buscar telefone financeiro ou telefone da empresa
    const company = await this.prisma.company.findUnique({
      where: { id: input.companyId },
      select: { name: true, phone: true },
    });
    if (!company) return;

    const rawPhone = config.financialWhatsappPhone || company.phone;
    if (!rawPhone) {
      await this.logNotif(input, 'WHATSAPP', 'SKIPPED', undefined, 'Telefone não configurado');
      return;
    }

    const phone = normalizePhone(rawPhone);
    if (phone.length < 10) {
      await this.logNotif(input, 'WHATSAPP', 'SKIPPED', undefined, 'Telefone inválido');
      return;
    }

    const key = this.idempotencyKey(input, 'WHATSAPP');
    if (await this.alreadySent(key)) return;

    await this.logNotif(input, 'WHATSAPP', 'PENDING', undefined, undefined, phone);

    try {
      const message = buildMessage(input.type, input, company.name);

      // Tenta via fila Bull primeiro, depois fallback para messageSender direto
      if (this.whatsappQueue) {
        await this.whatsappQueue.add({
          companyId: input.companyId,
          phone,
          message,
        });
        await this.logNotif(input, 'WHATSAPP', 'SENT', undefined, undefined, phone);
      } else if (this.messageSender) {
        await this.messageSender.sendWhatsapp(input.companyId, phone, message);
        await this.logNotif(input, 'WHATSAPP', 'SENT', undefined, undefined, phone);
      } else {
        await this.logNotif(input, 'WHATSAPP', 'SKIPPED', undefined, 'Fila e sender não disponíveis', phone);
      }
    } catch (err) {
      await this.logNotif(input, 'WHATSAPP', 'FAILED', undefined, err instanceof Error ? err.message : String(err), phone);
      // Nunca relançar para não bloquear o webhook
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async getConfig(companyId: string) {
    const config = await this.prisma.companyFinanceConfig.findUnique({ where: { companyId } });
    return config ?? {
      notificationsEnabled: true,
      internalNotificationsEnabled: true,
      emailNotificationsEnabled: true,
      whatsappNotificationsEnabled: false,
      notifyChargeCreated: true,
      notifyPaymentConfirmed: true,
      notifyPaymentOverdue: true,
      notifyPaymentCanceled: true,
      notifyInvoiceAuthorized: true,
      financialWhatsappPhone: null,
    };
  }

  private shouldNotifyType(config: Awaited<ReturnType<typeof this.getConfig>>, type: FinanceNotificationType): boolean {
    switch (type) {
      case 'CHARGE_CREATED': return config.notifyChargeCreated;
      case 'PAYMENT_CONFIRMED': return config.notifyPaymentConfirmed;
      case 'PAYMENT_OVERDUE': return config.notifyPaymentOverdue;
      case 'PAYMENT_CANCELED':
      case 'PAYMENT_REFUNDED': return config.notifyPaymentCanceled;
      case 'INVOICE_AUTHORIZED':
      case 'INVOICE_CANCELED': return config.notifyInvoiceAuthorized;
      default: return true;
    }
  }

  private idempotencyKey(input: FinanceNotificationInput, channel: NotifChannel): string {
    const ref = input.paymentId ?? input.invoiceId ?? input.companyId;
    return `${input.companyId}:${ref}:${input.type}:${channel}`;
  }

  private async alreadySent(key: string): Promise<boolean> {
    const existing = await this.prisma.financeNotificationLog.findUnique({
      where: { idempotencyKey: key },
    });
    if (existing && existing.status === 'SENT') {
      this.logger.debug(`Notificação já enviada, chave: ${key}`);
      return true;
    }
    return false;
  }

  private async logNotif(
    input: FinanceNotificationInput,
    channel: NotifChannel,
    status: NotifStatus,
    providerId?: string,
    errorMessage?: string,
    recipient?: string,
  ): Promise<void> {
    const key = this.idempotencyKey(input, channel);
    try {
      await this.prisma.financeNotificationLog.upsert({
        where: { idempotencyKey: key },
        create: {
          companyId: input.companyId,
          paymentId: input.paymentId,
          invoiceId: input.invoiceId,
          eventType: input.type,
          channel,
          recipient,
          status,
          providerId,
          errorMessage,
          idempotencyKey: key,
          sentAt: status === 'SENT' ? new Date() : undefined,
        },
        update: {
          status,
          providerId,
          errorMessage,
          sentAt: status === 'SENT' ? new Date() : undefined,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.warn(`Falha ao salvar log de notificação [${key}]: ${String(err)}`);
    }
  }
}
