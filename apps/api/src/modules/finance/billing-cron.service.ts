import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { FinanceNotificationService } from './finance-notification.service';
import { AsaasService } from './asaas.service';
import { PricingService } from './pricing.service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeNotificationService: FinanceNotificationService,
    private readonly asaas: AsaasService,
    private readonly pricing: PricingService,
  ) {}

  @Cron('0 * * * *')
  async auditOperationalConsistency() {
    const [paidWithoutAccess, activeWithOverdue, subscriptionWithoutAsaas, failedWebhooks, failedWhatsapp] = await Promise.all([
      this.prisma.platformInvoice.count({
        where: { status: 'PAID', company: { OR: [{ status: { not: 'ACTIVE' } }, { isActive: false }] } },
      }),
      this.prisma.company.count({
        where: { status: 'ACTIVE', platformInvoices: { some: { status: 'OVERDUE', deletedAt: null } } },
      }),
      this.prisma.companySubscription.count({
        where: {
          status: 'ACTIVE',
          asaasSubscriptionId: null,
          company: { asaasSubscriptionId: null },
        },
      }),
      this.prisma.asaasWebhookEvent.count({ where: { status: 'FAILED' } }),
      this.prisma.financeNotificationLog.count({ where: { channel: 'WHATSAPP', status: 'FAILED' } }),
    ]);

    const counters = { paidWithoutAccess, activeWithOverdue, subscriptionWithoutAsaas, failedWebhooks, failedWhatsapp };
    this.logger.log(`CRON_HEARTBEAT billing_consistency ${JSON.stringify(counters)}`);
    for (const [condition, count] of Object.entries(counters)) {
      if (count > 0) this.logger.error(`OPERATIONAL_ALERT ${JSON.stringify({ condition, count })}`);
    }
  }

  @Cron('0 2 * * *')
  async applyScheduledSeatReductions() {
    const now = new Date();
    const subscriptions = await this.prisma.companySubscription.findMany({
      where: {
        pendingSeatQuantity: { not: null },
        OR: [
          { currentPeriodEnd: { lte: now } },
          { currentPeriodEnd: null, nextDueDate: { lte: now } },
        ],
      },
      include: {
        plan: true,
        company: { select: { asaasSubscriptionId: true } },
      },
    });

    for (const subscription of subscriptions) {
      const nextSeatQuantity = subscription.pendingSeatQuantity;
      if (!nextSeatQuantity || !subscription.plan) continue;
      try {
        const quote = this.pricing.calculate(
          subscription.plan.commitmentMonths as 1 | 3 | 6 | 12,
          nextSeatQuantity,
        );
        const asaasSubscriptionId = subscription.asaasSubscriptionId || subscription.company.asaasSubscriptionId;
        if (asaasSubscriptionId && this.asaas.isConfigured()) {
          await this.asaas.updateSubscription(asaasSubscriptionId, { value: quote.total });
        }
        await this.prisma.companySubscription.update({
          where: { id: subscription.id },
          data: {
            seatQuantity: nextSeatQuantity,
            pendingSeatQuantity: null,
            pricingVersion: subscription.plan.pricingVersion,
            baseMonthlyPrice: subscription.plan.baseMonthlyPrice,
            userMonthlyPrice: subscription.plan.userMonthlyPrice,
            discountPercent: subscription.plan.discountPercent,
          },
        });
      } catch (error) {
        this.logger.error(`Falha ao aplicar redução de licenças da empresa ${subscription.companyId}: ${String(error)}`);
      }
    }
  }

  // Gera uma proposta recuperável cinco dias antes do fim do trial.
  @Cron('30 3 * * *')
  async createTrialConversionProposals() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 4.5 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 5.5 * 24 * 60 * 60 * 1000);

    const companies = await this.prisma.company.findMany({
      where: {
        billingStatus: 'TRIAL',
        trialEndsAt: { gte: windowStart, lte: windowEnd },
        isActive: true,
      },
      include: {
        subscription: { include: { plan: true } },
        users: {
          where: { role: 'ADMIN', isActive: true },
          select: { id: true },
          take: 1,
        },
      },
    });

    for (const company of companies) {
      const admin = company.users[0];
      const plan = company.subscription?.plan;
      if (!admin || !plan || !company.trialEndsAt) continue;

      const proposalNumber = `TRIAL-${company.id.slice(0, 8)}-${company.trialEndsAt.toISOString().slice(0, 10).replace(/-/g, '')}`;
      const exists = await this.prisma.proposal.findUnique({ where: { proposalNumber } });
      if (exists) continue;

      const proposal = await this.prisma.proposal.create({
        data: {
          companyId: company.id,
          proposalNumber,
          status: 'DRAFT',
          title: 'Proposta automática de continuidade após o trial',
          description: 'Proposta gerada automaticamente cinco dias antes do encerramento do período de avaliação.',
          startDate: company.trialEndsAt,
          planType: plan.code || plan.name,
          monthlyPrice: Number(plan.baseMonthlyPrice) + Number(plan.userMonthlyPrice) * company.subscription!.seatQuantity,
          usersLimit: company.subscription!.seatQuantity,
          employeesLimit: plan.maxEmployees,
          features: plan.activeModules,
          createdBy: admin.id,
        },
      });

      await this.prisma.proposalAuditLog.create({
        data: {
          proposalId: proposal.id,
          action: 'TRIAL_DAY_25_PROPOSAL_CREATED',
          actor: 'SYSTEM',
          metadata: JSON.stringify({ trialEndsAt: company.trialEndsAt, companyId: company.id }),
        },
      });
    }

    if (companies.length) this.logger.log(`Rotina de conversão de trial analisou ${companies.length} empresa(s).`);
  }

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
            billingStatus: 'PAST_DUE',
            isActive: false,
            suspensionReason: 'trial_expirado',
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
              isActive: false,
              suspensionReason: 'inadimplencia',
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
