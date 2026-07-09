import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Roda todos os dias as 08:00
  @Cron('0 8 * * *')
  async checkOverdueInvoices() {
    this.logger.log('Iniciando rotina de verificação de inadimplência...');

    // Simulando busca de faturas atrasadas e bloqueios
    // Como combinado, a rotina real de bloqueio não será aplicada ainda às empresas, 
    // mas a lógica está pronta para ser conectada.
    
    // const overdueCompanies = await this.prisma.company.findMany({
    //   where: { billingStatus: { not: 'PAST_DUE_BLOCK' }, invoices: { some: { status: 'OVERDUE' } } }
    // });
    
    // Para cada empresa, verificar há quantos dias a fatura venceu.
    // Dias = 1,2,3,4 -> notificar
    // Dias = 5 -> this.prisma.company.update({ status: 'SUSPENDED', billingStatus: 'PAST_DUE_BLOCK' })
    
    this.logger.log('Rotina de verificação de inadimplência finalizada (Simulação).');
  }
}
