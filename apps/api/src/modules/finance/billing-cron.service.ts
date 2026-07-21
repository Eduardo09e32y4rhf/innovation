import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { FinanceNotificationService } from './finance-notification.service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeNotificationService: FinanceNotificationService,
  ) {}

  // ─── Expiração de Trial — 04:00 diariamente ────────────────────────
  @Cron('0 4 * * *')
  async checkExpiredTrials() {
    this.logger.log('Iniciando rotina de verificação de trials expirados...');
    try {
      const today = new Date();
      const expiredCompanies = await this.prisma.company.findMany({
        where: {
          billingStatus: 'TRIAL',
          trialEndsAt: { lt: today },
          isActive: true,
        },
      });

      for (const company of expiredCompanies) {
        this.logger.log(`Trial expirado para a empresa ${company.id}. Bloqueando acesso...`);
        await this.prisma.company.update({
          where: { id: company.id },
          data: {
            status: 'SUSPENDED',
            billingStatus: 'PENDING_PAYMENT',
            suspensionReason: 'Período de teste expirado',
          },
        });
      }
      this.logger.log(`Rotina de trial finalizada. Analisadas ${expiredCompanies.length} empresas.`);
    } catch (error) {
      this.logger.error('Erro ao rodar rotina de trials', error);
    }
  }

  @Cron('30 4 * * *')
  async checkExpiredManualContracts() {
    const now = new Date();
    const expired = await this.prisma.manualContract.findMany({
      where: { status: 'ACTIVE', endsAt: { lt: now } },
      select: { id: true, companyId: true },
    });
    for (const contract of expired) {
      await this.prisma.$transaction([
        this.prisma.manualContract.update({ where: { id: contract.id }, data: { status: 'ENDED' } }),
        this.prisma.companySubscription.updateMany({ where: { companyId: contract.companyId, status: 'MANUAL_CONTRACT' }, data: { status: 'ENDED' } }),
        this.prisma.company.update({ where: { id: contract.companyId }, data: { status: 'SUSPENDED', isActive: false, billingStatus: 'PAST_DUE', suspensionReason: 'contrato_manual_expirado' } }),
      ]);
    }
    if (expired.length) this.logger.log(`${expired.length} contrato(s) manual(is) encerrado(s).`);
  }

  // ─── Suspensão por inadimplência — 08:00 diariamente ────────────────────────

  @Cron('0 8 * * *')
  async checkOverdueInvoices() {
    this.logger.log('Iniciando rotina de verificação de inadimplência...');

    try {
      const overdueInvoices = await this.prisma.platformInvoice.findMany({
        where: { status: 'OVERDUE' },
        include: { company: true },
        orderBy: { dueDate: 'asc' },
      });

      const today = new Date();
      const checkedCompanies = new Set<string>();

      for (const invoice of overdueInvoices) {
        const company = invoice.company;

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
              billingStatus: 'PAST_DUE',
              suspensionReason: 'Falta de pagamento (inadimplência)',
            },
          });
        }
      }

      this.logger.log(`Rotina de inadimplência finalizada. Analisadas ${checkedCompanies.size} empresas.`);
    } catch (error) {
      this.logger.error('Erro ao rodar rotina de inadimplência', error);
    }
  }

  // ─── Lembretes de vencimento — 09:00 diariamente ────────────────────────────

  @Cron('0 9 * * *')
  async sendPaymentReminders() {
    this.logger.log('Iniciando rotina de lembretes de vencimento...');

    try {
      const reminderDaysBefore = parseInt(process.env.FINANCE_NOTIFICATION_REMINDER_DAYS_BEFORE ?? '3', 10);
      const overdueDays = (process.env.FINANCE_NOTIFICATION_OVERDUE_DAYS ?? '1,5,10')
        .split(',')
        .map(d => parseInt(d.trim(), 10))
        .filter(d => !isNaN(d));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar cobranças abertas e vencidas (localmente)
      const openInvoices = await this.prisma.platformInvoice.findMany({
        where: {
          status: { in: ['OPEN', 'OVERDUE'] },
          deletedAt: null,
        },
        select: {
          id: true,
          companyId: true,
          amount: true,
          dueDate: true,
          status: true,
          billingType: true,
          asaasPaymentId: true,
        },
      });

      let processed = 0;

      for (const invoice of openInvoices) {
        const dueDate = new Date(invoice.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const diffMs = dueDate.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 3600 * 24)); // positivo = dias até vencer, negativo = dias após vencer

        let shouldNotify = false;
        let notifType: 'CHARGE_CREATED' | 'PAYMENT_OVERDUE' = 'PAYMENT_OVERDUE';

        if (diffDays === reminderDaysBefore || diffDays === 0) {
          // Lembrete antes do vencimento ou no dia
          shouldNotify = true;
          notifType = 'CHARGE_CREATED'; // usa template "cobrança criada" com vencimento
        } else if (diffDays < 0 && overdueDays.includes(Math.abs(diffDays))) {
          // Atraso configurado (1, 5, 10 dias após)
          shouldNotify = true;
          notifType = 'PAYMENT_OVERDUE';
        }

        if (!shouldNotify) continue;

        try {
          await this.financeNotificationService.notify({
            companyId: invoice.companyId,
            paymentId: invoice.asaasPaymentId ?? invoice.id,
            type: notifType,
            amount: Number(invoice.amount),
            dueDate: invoice.dueDate,
            billingType: invoice.billingType,
          });
          processed++;
        } catch (err) {
          this.logger.error(`Erro ao enviar lembrete para invoice ${invoice.id}: ${String(err)}`);
        }
      }

      this.logger.log(`Rotina de lembretes finalizada. Processadas ${processed} notificações.`);
    } catch (error) {
      this.logger.error('Erro ao rodar rotina de lembretes', error);
    }
  }
}
