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

    try {
      // Find companies where their invoices have status OVERDUE
      const overdueInvoices = await this.prisma.platformInvoice.findMany({
        where: { status: 'OVERDUE' },
        include: { company: true },
        orderBy: { dueDate: 'asc' },
      });

      const today = new Date();

      const checkedCompanies = new Set<string>();

      for (const invoice of overdueInvoices) {
        const company = invoice.company;

        // Skip if already cancelled or already checked
        if (company.billingStatus === 'CANCELED' || company.status === 'SUSPENDED' || checkedCompanies.has(company.id)) {
           continue;
        }

        checkedCompanies.add(company.id);

        const dueDate = new Date(invoice.dueDate);

        const timeDiff = today.getTime() - dueDate.getTime();
        const diffDays = Math.floor(timeDiff / (1000 * 3600 * 24));

        if (diffDays >= 5) {
           this.logger.warn(`Empresa ${company.id} com fatura atrasada há ${diffDays} dias. Bloqueando...`);
           await this.prisma.company.update({
             where: { id: company.id },
             data: {
               status: 'SUSPENDED',
               billingStatus: 'PAST_DUE'
             }
           });

           // Em um caso real, aqui também enviaríamos um e-mail para o cliente avisando do bloqueio.
        }
      }

      this.logger.log(`Rotina de verificação de inadimplência finalizada. Analisadas ${checkedCompanies.size} empresas.`);
    } catch (error) {
      this.logger.error('Erro ao rodar rotina de inadimplência', error);
    }
  }
}
