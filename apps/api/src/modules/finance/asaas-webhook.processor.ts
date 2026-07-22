import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { FinanceNotificationService, FinanceNotificationType } from './finance-notification.service';

type InvoiceStatus = 'OPEN' | 'PAID' | 'OVERDUE' | 'CANCELED';

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
  payment?: string;
  status?: string;
  number?: string;
  series?: string;
  validationCode?: string;
  value?: number;
  pdfUrl?: string;
  xmlUrl?: string;
}

interface AsaasWebhookPayload {
  event?: string;
  payment?: AsaasWebhookPayment;
  invoice?: AsaasWebhookInvoice;
}

const PAYMENT_EVENT_MAP: Record<string, FinanceNotificationType | undefined> = {
  PAYMENT_CREATED: 'CHARGE_CREATED',
  PAYMENT_RESTORED: 'CHARGE_CREATED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED: 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED_IN_CASH: 'PAYMENT_CONFIRMED',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  PAYMENT_DELETED: 'PAYMENT_CANCELED',
  PAYMENT_CHARGEBACK_REQUESTED: 'PAYMENT_CANCELED',
  PAYMENT_CHARGEBACK_DISPUTE: 'PAYMENT_CANCELED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_REFUND_IN_PROGRESS: 'PAYMENT_REFUNDED',
};

const INVOICE_EVENT_MAP: Record<string, FinanceNotificationType | undefined> = {
  INVOICE_AUTHORIZED: 'INVOICE_AUTHORIZED',
  INVOICE_CANCELED: 'INVOICE_CANCELED',
};

@Injectable()
export class AsaasWebhookProcessorService {
  private readonly logger = new Logger(AsaasWebhookProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: FinanceNotificationService,
  ) {}

  async processStoredEvent(eventId: string) {
    const claimed = await this.prisma.asaasWebhookEvent.updateMany({
      where: { id: eventId, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'PROCESSING', attempts: { increment: 1 }, errorMessage: null },
    });
    if (!claimed.count) return;

    const stored = await this.prisma.asaasWebhookEvent.findUnique({ where: { id: eventId } });
    if (!stored) return;

    try {
      const payload = stored.payload as unknown as AsaasWebhookPayload;
      const event = payload.event || stored.eventType;
      if (payload.payment?.id) await this.handlePaymentEvent(event, payload.payment);
      if (payload.invoice?.id) await this.handleInvoiceEvent(event, payload.invoice);

      const recognized = Boolean(this.statusFromEvent(event) || ['INVOICE_AUTHORIZED', 'INVOICE_CANCELED', 'INVOICE_ERROR'].includes(event));
      await this.prisma.asaasWebhookEvent.update({
        where: { id: eventId },
        data: {
          status: recognized ? 'PROCESSED' : 'IGNORED',
          processedAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (error) {
      await this.prisma.asaasWebhookEvent.update({
        where: { id: eventId },
        data: { status: 'FAILED', errorMessage: String(error).slice(0, 2000) },
      }).catch(() => undefined);
      throw error;
    }
  }

  private async handlePaymentEvent(event: string, payment: AsaasWebhookPayment) {
    const status = this.statusFromEvent(event);
    if (!status) return;
    const company = await this.resolveCompany(payment);
    if (!company) {
      this.logger.warn(`Pagamento ${payment.id} sem empresa vinculada.`);
      return;
    }

    await this.syncProposal(company.id, event, payment);
    const existing = await this.prisma.platformInvoice.findUnique({ where: { asaasPaymentId: payment.id } });
    const invoiceData = {
      companyId: company.id,
      description: payment.description || 'Cobrança Asaas',
      amount: payment.value,
      dueDate: payment.dueDate ? new Date(payment.dueDate) : new Date(),
      status,
      billingType: payment.billingType || 'PIX',
      invoiceUrl: payment.invoiceUrl,
      paidAt: status === 'PAID' ? existing?.paidAt ?? new Date() : existing?.paidAt,
      deletedAt: event === 'PAYMENT_DELETED' ? new Date() : null,
    };

    const companyData: any = status === 'PAID'
      ? { billingStatus: 'ACTIVE', status: 'ACTIVE', isActive: true, suspensionReason: null }
      : status === 'OVERDUE'
        ? { billingStatus: 'PAST_DUE' }
        : status === 'CANCELED'
          ? { billingStatus: 'PAST_DUE', status: 'SUSPENDED', isActive: false, suspensionReason: 'pagamento_cancelado_ou_estornado' }
          : {};

    const [invoice] = await this.prisma.$transaction([
      existing
        ? this.prisma.platformInvoice.update({ where: { id: existing.id }, data: invoiceData })
        : this.prisma.platformInvoice.create({ data: { ...invoiceData, asaasPaymentId: payment.id } }),
      ...(Object.keys(companyData).length ? [this.prisma.company.update({ where: { id: company.id }, data: companyData })] : []),
    ]);

    const type = PAYMENT_EVENT_MAP[event];
    if (type) {
      await this.notifications.notify({
        companyId: company.id,
        paymentId: invoice.id,
        type,
        amount: payment.value,
        dueDate: payment.dueDate ? new Date(payment.dueDate) : undefined,
        paidAt: status === 'PAID' ? new Date() : undefined,
        billingType: payment.billingType,
        paymentUrl: payment.invoiceUrl,
      });
    }
  }

  private async handleInvoiceEvent(event: string, invoice: AsaasWebhookInvoice) {
    if (!invoice.payment) return;
    const platformInvoice = await this.prisma.platformInvoice.findUnique({
      where: { asaasPaymentId: invoice.payment },
      select: { id: true, companyId: true, amount: true },
    });
    if (!platformInvoice) {
      this.logger.warn(`Nota fiscal ${invoice.id} sem cobrança vinculada.`);
      return;
    }

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

    const type = INVOICE_EVENT_MAP[event];
    if (type) {
      await this.notifications.notify({
        companyId: platformInvoice.companyId,
        paymentId: invoice.payment,
        invoiceId: platformInvoice.id,
        type,
        amount: invoice.value ?? Number(platformInvoice.amount),
        invoiceNumber: invoice.number,
        fiscalPdfUrl: invoice.pdfUrl,
        fiscalXmlUrl: invoice.xmlUrl,
      });
    }
  }

  private statusFromEvent(event: string): InvoiceStatus | undefined {
    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED_IN_CASH'].includes(event)) return 'PAID';
    if (event === 'PAYMENT_OVERDUE') return 'OVERDUE';
    if (['PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'PAYMENT_REFUND_IN_PROGRESS', 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE'].includes(event)) return 'CANCELED';
    if (['PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_RESTORED'].includes(event)) return 'OPEN';
    return undefined;
  }

  private async resolveCompany(payment: AsaasWebhookPayment) {
    const existing = await this.prisma.platformInvoice.findUnique({
      where: { asaasPaymentId: payment.id },
      select: { company: { select: { id: true } } },
    });
    if (existing) return existing.company;
    if (payment.customer) {
      const company = await this.prisma.company.findFirst({
        where: { asaasCustomerId: payment.customer },
        select: { id: true },
      });
      if (company) return company;
    }
    if (payment.externalReference) {
      const companyId = payment.externalReference.startsWith('signup:')
        ? payment.externalReference.slice('signup:'.length)
        : payment.externalReference;
      return this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true } }).catch(() => null);
    }
    return null;
  }

  private async syncProposal(companyId: string, event: string, payment: AsaasWebhookPayment) {
    if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event)) return;
    const proposal = await this.prisma.proposal.findFirst({
      where: { companyId, asaasInvoiceId: payment.subscription || payment.id },
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

@Processor('asaas-webhook')
export class AsaasWebhookWorker {
  constructor(private readonly processor: AsaasWebhookProcessorService) {}

  @Process('process')
  process(job: Job<{ eventId: string }>) {
    return this.processor.processStoredEvent(job.data.eventId);
  }
}
