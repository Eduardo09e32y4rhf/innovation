import { Body, Controller, ForbiddenException, Headers, HttpCode, Logger, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { FinanceNotificationService, FinanceNotificationType } from './finance-notification.service';

type InvoiceStatus = 'OPEN' | 'PAID' | 'OVERDUE' | 'CANCELED';

// ─── DTOs do Webhook ──────────────────────────────────────────────────────────

interface AsaasWebhookPayment {
  id: string;
  customer: string;
  subscription?: string;
  externalReference?: string;
  value: number;
  dueDate?: string;
  description?: string;
  billingType?: string;
  invoiceUrl?: string;
}

interface AsaasWebhookInvoice {
  id: string;
  customer?: string;
  payment?: string;
  status?: string;
  number?: string;
  series?: string;
  validationCode?: string;
  value?: number;
  effectiveDate?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  externalReference?: string;
}

interface AsaasWebhookPayload {
  id?: string;
  event?: string;
  payment?: AsaasWebhookPayment;
  invoice?: AsaasWebhookInvoice;
}

// ─── Mapeamento de eventos → tipos de notificação ────────────────────────────

const PAYMENT_EVENT_MAP: Record<string, FinanceNotificationType | undefined> = {
  PAYMENT_CREATED: 'CHARGE_CREATED',
  PAYMENT_RESTORED: 'CHARGE_CREATED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED: 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED_IN_CASH: 'PAYMENT_CONFIRMED',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  PAYMENT_DELETED: 'PAYMENT_CANCELED',
  PAYMENT_CHARGEBACK_REQUESTED: 'PAYMENT_CANCELED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_REFUND_IN_PROGRESS: 'PAYMENT_REFUNDED',
};

const INVOICE_EVENT_MAP: Record<string, FinanceNotificationType | undefined> = {
  INVOICE_AUTHORIZED: 'INVOICE_AUTHORIZED',
  INVOICE_CANCELED: 'INVOICE_CANCELED',
};

// ─── Controller ───────────────────────────────────────────────────────────────

@SkipThrottle()
@Controller('finance/webhook')
export class AsaasWebhookController {
  private readonly logger = new Logger(AsaasWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeNotificationService: FinanceNotificationService,
  ) {}

  @Post('asaas')
  @HttpCode(200)
  async handleAsaasWebhook(
    @Headers('asaas-access-token') accessToken: string | undefined,
    @Body() payload: AsaasWebhookPayload,
  ) {
    this.validateToken(accessToken);
    const event = payload?.event;
    if (!event) return { received: true };

    this.logger.log(`Webhook Asaas: ${event}`);

    // ── Eventos de pagamento ──
    if (payload.payment?.id) {
      await this.handlePaymentEvent(event, payload.payment);
    }

    // ── Eventos de nota fiscal ──
    if (payload.invoice?.id) {
      await this.handleInvoiceEvent(event, payload.invoice);
    }

    return { received: true };
  }

  // ─── Processamento de pagamento ──────────────────────────────────────────────

  private async handlePaymentEvent(event: string, payment: AsaasWebhookPayment): Promise<void> {
    const status = this.statusFromEvent(event);
    if (!status) return;

    const company = await this.resolveCompanyFromPayment(payment);
    if (!company) {
      this.logger.warn(`Pagamento ${payment.id} sem empresa vinculada.`);
      return;
    }

    await this.syncProposal(company.id, event, payment);
    const existingInvoice = await this.prisma.platformInvoice.findUnique({ where: { asaasPaymentId: payment.id } });
    const invoiceData = {
      companyId: company.id,
      description: payment.description || 'Cobranca Asaas',
      amount: payment.value,
      dueDate: payment.dueDate ? new Date(payment.dueDate) : new Date(),
      status,
      billingType: payment.billingType || 'PIX',
      invoiceUrl: payment.invoiceUrl,
      paidAt: status === 'PAID' ? existingInvoice?.paidAt ?? new Date() : existingInvoice?.paidAt,
      deletedAt: event === 'PAYMENT_DELETED' ? new Date() : null,
    };

    let companyData: any = {};
    if (status === 'PAID') {
      companyData = { billingStatus: 'ACTIVE', status: 'ACTIVE', isActive: true, suspensionReason: null };
    } else if (status === 'OVERDUE') {
      companyData = { billingStatus: 'PAST_DUE' };
    } else if (status === 'CANCELED') {
      companyData = { billingStatus: 'PAST_DUE', status: 'SUSPENDED', isActive: false, suspensionReason: 'pagamento_cancelado_ou_estornado' };
    }

    const [invoice] = await this.prisma.$transaction([
      existingInvoice
        ? this.prisma.platformInvoice.update({ where: { id: existingInvoice.id }, data: invoiceData })
        : this.prisma.platformInvoice.create({ data: { ...invoiceData, asaasPaymentId: payment.id } }),
      ...(Object.keys(companyData).length > 0 ? [this.prisma.company.update({ where: { id: company.id }, data: companyData })] : []),
    ]);

    // Notificação — falha nunca retorna erro ao Asaas
    const notifType = PAYMENT_EVENT_MAP[event];
    if (notifType) {
      try {
        await this.financeNotificationService.notify({
          companyId: company.id,
          paymentId: invoice?.id ?? payment.id,
          type: notifType,
          amount: payment.value,
          dueDate: payment.dueDate ? new Date(payment.dueDate) : undefined,
          paidAt: status === 'PAID' ? new Date() : undefined,
          billingType: payment.billingType,
          paymentUrl: payment.invoiceUrl,
        });
      } catch (err) {
        this.logger.error(
          `Falha ao processar notificação financeira ${event}/${payment.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  // ─── Processamento de nota fiscal ────────────────────────────────────────────

  private async handleInvoiceEvent(event: string, invoice: AsaasWebhookInvoice): Promise<void> {
    const notifType = INVOICE_EVENT_MAP[event];

    // Vincular ao PlatformInvoice pelo paymentId
    let platformInvoice: { id: string; companyId: string; amount: any } | null = null;
    if (invoice.payment) {
      platformInvoice = await this.prisma.platformInvoice.findUnique({
        where: { asaasPaymentId: invoice.payment },
        select: { id: true, companyId: true, amount: true },
      });
    }

    if (!platformInvoice) {
      this.logger.warn(`Nota fiscal ${invoice.id} sem PlatformInvoice vinculada (payment: ${invoice.payment ?? 'N/A'})`);
      return;
    }

    // Salvar dados da nota fiscal no PlatformInvoice
    await this.prisma.platformInvoice.update({
      where: { id: platformInvoice.id },
      data: {
        asaasInvoiceId: invoice.id,
        invoiceNumber: invoice.number,
        invoiceSeries: invoice.series,
        invoiceValidationCode: invoice.validationCode,
        fiscalPdfUrl: invoice.pdfUrl,
        fiscalXmlUrl: invoice.xmlUrl,
        invoiceStatus: invoice.status,
        invoiceAuthorizedAt: event === 'INVOICE_AUTHORIZED' ? new Date() : undefined,
        invoiceCanceledAt: event === 'INVOICE_CANCELED' ? new Date() : undefined,
      },
    });

    this.logger.log(`Nota fiscal ${invoice.id} atualizada no PlatformInvoice ${platformInvoice.id}`);

    // Notificação
    if (notifType) {
      try {
        await this.financeNotificationService.notify({
          companyId: platformInvoice.companyId,
          paymentId: invoice.payment,
          invoiceId: platformInvoice.id,
          type: notifType,
          amount: invoice.value ?? Number(platformInvoice.amount),
          invoiceNumber: invoice.number,
          fiscalPdfUrl: invoice.pdfUrl,
          fiscalXmlUrl: invoice.xmlUrl,
        });
      } catch (err) {
        this.logger.error(
          `Falha ao processar notificação de NFS-e ${event}/${invoice.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  // ─── Helpers existentes preservados ──────────────────────────────────────────

  private validateToken(accessToken?: string) {
    const expected = process.env.ASAAS_WEBHOOK_TOKEN || process.env.ASAAS_WEBHOOK_SECRET;
    if (!expected) {
      this.logger.warn('ASAAS_WEBHOOK_TOKEN/ASAAS_WEBHOOK_SECRET nao configurado.');
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('Webhook nao configurado.');
      }
      return;
    }
    if (!accessToken || !this.secureEqual(accessToken, expected)) {
      throw new ForbiddenException('Token de webhook invalido.');
    }
  }

  private secureEqual(received: string, expected: string) {
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);
    return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  }

  private statusFromEvent(event: string): InvoiceStatus | undefined {
    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED_IN_CASH'].includes(event)) return 'PAID';
    if (event === 'PAYMENT_OVERDUE') return 'OVERDUE';
    if (['PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'PAYMENT_REFUND_IN_PROGRESS', 'PAYMENT_CHARGEBACK_REQUESTED'].includes(event)) return 'CANCELED';
    if (['PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_RESTORED'].includes(event)) return 'OPEN';
    return undefined;
  }

  private async resolveCompanyFromPayment(payment: AsaasWebhookPayment) {
    const existingInvoice = await this.prisma.platformInvoice.findUnique({
      where: { asaasPaymentId: payment.id },
      select: { company: { select: { id: true } } },
    });
    if (existingInvoice) return existingInvoice.company;

    if (payment.customer) {
      const company = await this.prisma.company.findFirst({
        where: { asaasCustomerId: payment.customer },
        select: { id: true },
      });
      if (company) return company;
    }

    if (payment.externalReference) {
      return this.prisma.company.findUnique({
        where: { id: payment.externalReference },
        select: { id: true },
      }).catch(() => null);
    }
    return null;
  }

  private async syncProposal(companyId: string, event: string, payment: AsaasWebhookPayment) {
    if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') return;
    const proposal = await this.prisma.proposal.findFirst({
      where: {
        companyId,
        asaasInvoiceId: payment.subscription || payment.id,
      },
    });
    if (!proposal || proposal.status === 'PAID') return;

    await this.prisma.$transaction([
      this.prisma.proposal.update({
        where: { id: proposal.id },
        data: { status: 'PAID', paymentStatus: 'PAID', paidAt: new Date() },
      }),
      this.prisma.proposalAuditLog.create({
        data: {
          proposalId: proposal.id,
          action: 'PAYMENT_RECEIVED',
          actor: 'SYSTEM',
          metadata: JSON.stringify({ asaasPaymentId: payment.id, event }),
        },
      }),
    ]);
  }

}