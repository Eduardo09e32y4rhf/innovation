import { Controller, Post, Body, Req, Logger, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';

@Controller('webhooks/asaas')
export class AsaasWebhookController {
  private readonly logger = new Logger(AsaasWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async handleWebhook(@Body() payload: any, @Req() req: any) {
    this.logger.log(`Recebido webhook do Asaas: ${payload?.event}`);

    // Validar token no header
    const token = req.headers['asaas-access-token'];
    if (token !== process.env.ASAAS_API_KEY) {
      this.logger.error('Token de acesso do Asaas inválido');
      throw new UnauthorizedException('Unauthorized');
    }

    // Validar assinatura do webhook
    const rawBody = JSON.stringify(payload);
    const secret = process.env.ASAAS_WEBHOOK_SECRET || '';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const signature = hmac.digest('hex');

    if (signature !== req.headers['x-asaas-signature']) {
      this.logger.error('Assinatura do webhook do Asaas inválida');
      throw new UnauthorizedException('Invalid signature');
    }

    this.logger.log(`Webhook Asaas validado. Event: ${payload.event}, Payment ID: ${payload.payment?.id}`);
    
    if (payload?.event === 'PAYMENT_RECEIVED') {
      const paymentId = payload.payment?.id;
      if (paymentId) {
        // Encontra a invoice correspondente e atualiza
        // await this.prisma.invoice.updateMany({
        //   where: { asaasPaymentId: paymentId },
        //   data: { status: 'PAID', paidAt: new Date() }
        // });
        
        // Se a empresa estava bloqueada, debloquear:
        // const invoice = await this.prisma.invoice.findFirst({ where: { asaasPaymentId: paymentId } });
        // if (invoice) {
        //   await this.prisma.company.update({
        //     where: { id: invoice.companyId },
        //     data: { billingStatus: 'ACTIVE', status: 'ACTIVE' }
        //   });
        // }
      }
    } else if (payload?.event === 'PAYMENT_OVERDUE') {
      const paymentId = payload.payment?.id;
      if (paymentId) {
        // await this.prisma.invoice.updateMany({
        //   where: { asaasPaymentId: paymentId },
        //   data: { status: 'OVERDUE' }
        // });
      }
    }

    return { received: true };
  }
}
