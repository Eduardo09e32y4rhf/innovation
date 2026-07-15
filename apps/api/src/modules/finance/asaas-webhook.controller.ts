import { Controller, Post, Body, Headers, ForbiddenException, HttpCode, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';

@Controller('finance/webhook')
export class AsaasWebhookController {
  private readonly logger = new Logger(AsaasWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post('asaas')
  @HttpCode(200)
  async handleAsaasWebhook(
    @Headers('asaas-signature') signature: string,
    @Headers('x-asaas-signature') xSignature: string,
    @Headers('asaas-access-token') accessToken: string,
    @Body() payload: any,
  ) {
    this.logger.log(`Recebido webhook do Asaas: ${payload?.event}`);

    // Some configurations use 'asaas-access-token' check
    if (accessToken && accessToken !== process.env.ASAAS_API_KEY) {
       this.logger.error('Token de acesso do Asaas inválido');
       throw new ForbiddenException('Unauthorized token');
    }

    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (!webhookToken) {
      this.logger.warn('⚠️ Webhook do Asaas recebido, mas ASAAS_WEBHOOK_TOKEN não configurado.');
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('Configuração de webhook ausente');
      }
    } else {
      // Unified signature validation
      const sigToUse = signature || xSignature;
      if (!sigToUse) {
         this.logger.error('Assinatura ausente no webhook');
         throw new ForbiddenException('Assinatura ausente');
      }

      // Asaas envia a payload em JSON bruto para assinar
      const payloadString = JSON.stringify(payload);
      
      const expectedSignature = crypto
        .createHmac('sha256', webhookToken)
        .update(payloadString)
        .digest('hex');

      if (sigToUse !== expectedSignature) {
        this.logger.error('Assinatura inválida no webhook');
        throw new ForbiddenException('Assinatura inválida');
      }
    }

    const { event, payment } = payload;
    
    // Tratamos apenas alguns eventos chave
    if (!payment || !payment.id) return { received: true };

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      let companyIdToActivate = null;

      // 1. Procurar se é referente a uma proposta
      // (Em propostas antigas asaasInvoiceId guardava o asaasSubscriptionId ou paymentId)
      const proposal = await this.prisma.proposal.findFirst({
        where: { asaasInvoiceId: payment.subscription || payment.id },
      });

      if (proposal) {
        companyIdToActivate = proposal.companyId;

        if (proposal.status === 'PAYMENT_PENDING') {
          await this.prisma.proposal.update({
            where: { id: proposal.id },
            data: { status: 'PAID' },
          });

          // E também ativamos a empresa / faturamento
          await this.prisma.company.update({
            where: { id: proposal.companyId },
            data: { billingStatus: 'ACTIVE', plan: proposal.planType as any },
          });

          // Log na proposta
          await this.prisma.proposalAuditLog.create({
            data: {
              proposalId: proposal.id,
              action: 'PAYMENT_RECEIVED',
              actor: 'SYSTEM',
              metadata: JSON.stringify({ asaasPaymentId: payment.id, event })
            }
          });
        }
      }

      // 2. Atualizar ou criar PlatformInvoice
      // Primeiro descobre o companyId pelo customer, caso não tenhamos da proposal
      if (!companyIdToActivate) {
        const company = await this.prisma.company.findFirst({
          where: { asaasCustomerId: payment.customer }
        });
        if (company) {
          companyIdToActivate = company.id;
        }
      }

      if (companyIdToActivate) {
        // Encontra faturas existentes ou cria
        // Como o ID no asaas é a chave, no platformInvoice não temos a coluna,
        // mas podemos tentar pelo dueDate + amount ou idealmente adicionar asaasPaymentId.
        // Para não alterar o schema agora, vamos focar em achar faturas pendentes da empresa no mesmo valor/data e marcar pago, ou criar.

        const possibleInvoices = await this.prisma.platformInvoice.findMany({
          where: {
            companyId: companyIdToActivate,
            status: 'OPEN',
          }
        });

        let targetInvoice = possibleInvoices.find(inv => Math.abs(Number(inv.amount) - Number(payment.value)) < 0.1);

        if (targetInvoice) {
           await this.prisma.platformInvoice.update({
             where: { id: targetInvoice.id },
             data: { status: 'PAID', paidAt: new Date() }
           });
        } else {
           await this.prisma.platformInvoice.create({
             data: {
               companyId: companyIdToActivate,
               amount: payment.value,
               dueDate: payment.dueDate ? new Date(payment.dueDate) : new Date(),
               status: 'PAID',
               paidAt: new Date(),
             }
           });
        }

        // Vamos garantir que a empresa tá ativa
        await this.prisma.company.update({
           where: { id: companyIdToActivate },
           data: { billingStatus: 'ACTIVE', status: 'ACTIVE', suspensionReason: null }
        });
      }
    } else if (event === 'PAYMENT_OVERDUE') {
      // Procurar pela assinatura baseada no customer/subscription
      const company = await this.prisma.company.findFirst({
        where: { asaasCustomerId: payment.customer }
      });
      if (company) {
        // Also reflect overdue in invoices
        const openInvoices = await this.prisma.platformInvoice.findMany({
          where: { companyId: company.id, status: 'OPEN' }
        });

        let targetInvoice = openInvoices.find(inv => Math.abs(Number(inv.amount) - Number(payment.value)) < 0.1);

        if (targetInvoice) {
           await this.prisma.platformInvoice.update({
             where: { id: targetInvoice.id },
             data: { status: 'OVERDUE' }
           });
        } else {
           await this.prisma.platformInvoice.create({
             data: {
               companyId: company.id,
               amount: payment.value,
               dueDate: payment.dueDate ? new Date(payment.dueDate) : new Date(),
               status: 'OVERDUE',
             }
           });
        }

        await this.prisma.company.update({
          where: { id: company.id },
          data: { billingStatus: 'PAST_DUE' },
        });
      }
    }

    return { received: true };
  }
}
