import { Controller, Post, Body, Headers, ForbiddenException, HttpCode } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';

@Controller('finance/webhook')
export class AsaasWebhookController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('asaas')
  @HttpCode(200)
  async handleAsaasWebhook(
    @Headers('asaas-signature') signature: string,
    @Body() payload: any,
  ) {
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (!webhookToken) {
      console.warn('⚠️ Webhook do Asaas recebido, mas ASAAS_WEBHOOK_TOKEN não configurado.');
      // Na ausência de token de validação em dev, apenas logamos
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('Configuração de webhook ausente');
      }
    } else {
      if (!signature) throw new ForbiddenException('Assinatura ausente');

      // Asaas envia a payload em JSON bruto para assinar
      const payloadString = JSON.stringify(payload);
      
      const expectedSignature = crypto
        .createHmac('sha256', webhookToken)
        .update(payloadString)
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new ForbiddenException('Assinatura inválida');
      }
    }

    const { event, payment } = payload;
    
    // Tratamos apenas alguns eventos chave
    if (!payment || !payment.id) return { received: true };

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      // 1. Procurar se é referente a uma proposta
      const proposal = await this.prisma.proposal.findFirst({
        where: { asaasInvoiceId: payment.id }, // No acceptTerms setamos asaasInvoiceId = asaasSubscriptionId
      });

      if (proposal && proposal.status === 'PAYMENT_PENDING') {
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
    } else if (event === 'PAYMENT_OVERDUE') {
      // Procurar pela assinatura baseada no customer/subscription
      const company = await this.prisma.company.findFirst({
        where: { asaasCustomerId: payment.customer }
      });
      if (company) {
        await this.prisma.company.update({
          where: { id: company.id },
          data: { billingStatus: 'PAST_DUE' },
        });
      }
    }

    return { received: true };
  }
}
