import { Controller, Post, Body, Req, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Controller('webhooks/asaas')
export class AsaasWebhookController {
  private readonly logger = new Logger(AsaasWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async handleWebhook(@Body() payload: any, @Req() req: any) {
    this.logger.log(`Recebido webhook do Asaas: ${payload?.event}`);

    // Aqui deve-se validar o 'asaas-access-token' no header req.headers['asaas-access-token']
    
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
