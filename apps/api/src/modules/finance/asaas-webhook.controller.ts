import { Body, Controller, ForbiddenException, Headers, HttpCode, Logger, Post } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';

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

@SkipThrottle()
@Controller('finance/webhook')
export class AsaasWebhookController {
  private readonly logger = new Logger(AsaasWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post('asaas')
  @HttpCode(200)
  async handleAsaasWebhook(
    @Headers('asaas-access-token') accessToken: string | undefined,
    @Body() payload: { event?: string; payment?: AsaasWebhookPayment },
  ) {
    this.validateToken(accessToken);
    const event = payload?.event;
    const payment = payload?.payment;
    if (!event || !payment?.id) return { received: true };

    this.logger.log(`Webhook Asaas: ${event} / ${payment.id}`);
    const status = this.statusFromEvent(event);
    if (!status) return { received: true };

    const company = await this.resolveCompany(payment);
    if (!company) {
      this.logger.warn(`Pagamento ${payment.id} sem empresa vinculada.`);
      return { received: true };
    }

    await this.syncProposal(company.id, event, payment);
    await this.upsertInvoice(company.id, status, event, payment);

    if (status === 'PAID') {
      await this.prisma.company.update({
        where: { id: company.id },
        data: { billingStatus: 'ACTIVE', status: 'ACTIVE', isActive: true, suspensionReason: null },
      });
    } else if (status === 'OVERDUE') {
      // The daily billing job applies suspension only after the configured grace period.
      await this.prisma.company.update({
        where: { id: company.id },
        data: { billingStatus: 'PAST_DUE' },
      });
    }

    return { received: true };
  }

  private validateToken(accessToken?: string) {
    const expected = process.env.ASAAS_WEBHOOK_TOKEN;
    if (!expected) {
      this.logger.warn('ASAAS_WEBHOOK_TOKEN nao configurado.');
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

  private async resolveCompany(payment: AsaasWebhookPayment) {
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

  private async upsertInvoice(companyId: string, status: InvoiceStatus, event: string, payment: AsaasWebhookPayment) {
    const existing = await this.prisma.platformInvoice.findUnique({ where: { asaasPaymentId: payment.id } });
    const data = {
      companyId,
      description: payment.description || 'Cobranca Asaas',
      amount: payment.value,
      dueDate: payment.dueDate ? new Date(payment.dueDate) : new Date(),
      status,
      billingType: payment.billingType || 'UNDEFINED',
      invoiceUrl: payment.invoiceUrl,
      paidAt: status === 'PAID' ? existing?.paidAt ?? new Date() : existing?.paidAt,
      deletedAt: event === 'PAYMENT_DELETED' ? new Date() : null,
    };

    if (existing) {
      await this.prisma.platformInvoice.update({ where: { id: existing.id }, data });
      return;
    }
    await this.prisma.platformInvoice.create({ data: { ...data, asaasPaymentId: payment.id } });
  }
}