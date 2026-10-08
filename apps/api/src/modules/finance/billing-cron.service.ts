import { dunningConfigFromEnv, dunningStage } from './dunning';
import { CronLock } from '../../common/redis/cron-lock.decorator';
import { RedisService } from '../../common/redis/redis.service';
import { cronHeartbeat } from '../../common/metrics/app-metrics';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { FinanceNotificationService } from './finance-notification.service';
import { AsaasService } from './asaas.service';
import { PricingService } from './pricing.service';
import { PlatformFinanceService } from './platform-finance.service';
import { FaturasAcoesService } from './faturas-acoes.service';
import { couponDiscount } from '../coupons/coupon-rules';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeNotificationService: FinanceNotificationService,
    private readonly asaas: AsaasService,
    private readonly pricing: PricingService,
    private readonly platformFinance: PlatformFinanceService,
    private readonly faturasAcoes: FaturasAcoesService,
    private readonly redis: RedisService,
  ) {}

  @Cron('*/30 * * * *')
  @CronLock('billing.repairAsaasAssociations', 1500)
  async repairAsaasAssociations() {
    if (!this.asaas.isConfigured()) return;
    const subscriptions = await this.prisma.companySubscription.findMany({
      where: {
        asaasSubscriptionId: null,
        status: { in: ['TRIAL', 'MANUAL_CONTRACT'] },
        company: { isActive: true, platformPlanId: { not: null } },
      },
      select: {
        companyId: true,
        status: true,
        trialEndsAt: true,
        company: {
          select: {
            createdAt: true,
            manualContracts: { where: { status: 'ACTIVE' }, orderBy: { startsAt: 'desc' }, take: 1, select: { startsAt: true } },
          },
        },
      },
      take: 100,
    });

    for (const subscription of subscriptions) {
      try {
        if (subscription.status === 'TRIAL') {
          await this.platformFinance.ensureCompanyOnboardingBilling(subscription.companyId);
        } else {
          const nextDueDate = new Date(subscription.company.manualContracts[0]?.startsAt ?? subscription.company.createdAt);
          nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 1);
          await this.platformFinance.ensureManualContractBilling(subscription.companyId, nextDueDate);
        }
      } catch (error) {
        this.logger.warn(`Falha ao reconciliar Asaas da empresa ${subscription.companyId}: ${String(error)}`);
      }
    }
    if (subscriptions.length) this.logger.log(`Reconciliação Asaas verificou ${subscriptions.length} empresa(s).`);
  }

  @Cron('0 * * * *')
  @CronLock('billing.auditOperationalConsistency', 3000)
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
    cronHeartbeat('billing_consistency');
        this.logger.log(`CRON_HEARTBEAT billing_consistency ${JSON.stringify(counters)}`);
    for (const [condition, count] of Object.entries(counters)) {
      if (count > 0) this.logger.error(`OPERATIONAL_ALERT ${JSON.stringify({ condition, count })}`);
    }
  }

  @Cron('0 2 * * *')
  @CronLock('billing.applyScheduledSeatReductions', 3600)
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
        // Mesmo calculo da troca imediata: precos do plano da empresa e cupom ainda vigente.
        const coupon = subscription.couponType && !(subscription.couponCyclesLeft !== null && subscription.couponCyclesLeft <= 0)
          ? couponDiscount({ type: subscription.couponType, value: subscription.couponValue })
          : null;
        const quote = this.pricing.calculate(
          subscription.plan.commitmentMonths as 1 | 3 | 6 | 12,
          nextSeatQuantity,
          { baseMonthlyPrice: subscription.plan.baseMonthlyPrice, userMonthlyPrice: subscription.plan.userMonthlyPrice, price: subscription.plan.price, includedUnits: subscription.plan.includedUnits },
          coupon,
        );
        const asaasSubscriptionId = subscription.asaasSubscriptionId || subscription.company.asaasSubscriptionId;
        if (asaasSubscriptionId && this.asaas.isConfigured()) {
          await this.asaas.updateSubscription(asaasSubscriptionId, { value: quote.total });
        }
        await this.platformFinance.syncMercadoPagoAmount(subscription.companyId, quote.total);
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

  /** Conclui os cancelamentos de assinatura agendados para o fim do ciclo. */
  @Cron('30 2 * * *')
  @CronLock('billing.applyScheduledCancellations', 3600)
  async applyScheduledCancellations() {
    const count = await this.faturasAcoes.applyScheduledCancellations();
    if (count > 0) this.logger.log(`${count} cancelamento(s) agendado(s) concluido(s).`);
  }
  /** Aplica downgrades de plano agendados pela aba Faturas quando o ciclo atual termina. */
  @Cron('15 2 * * *')
  @CronLock('billing.applyScheduledPlanChanges', 3600)
  async applyScheduledPlanChanges() {
    const now = new Date();
    const subscriptions = await this.prisma.companySubscription.findMany({
      where: {
        pendingPlanId: { not: null },
        OR: [{ currentPeriodEnd: { lte: now } }, { currentPeriodEnd: null, nextDueDate: { lte: now } }],
      },
      include: { company: { select: { asaasSubscriptionId: true } } },
    });
    for (const subscription of subscriptions) {
      try {
        const plan = subscription.pendingPlanId ? await this.prisma.platformPlan.findUnique({ where: { id: subscription.pendingPlanId } }) : null;
        if (!plan) { await this.prisma.companySubscription.update({ where: { id: subscription.id }, data: { pendingPlanId: null } }); continue; }
        const quote = this.pricing.calculate(plan.commitmentMonths as 1 | 3 | 6 | 12, subscription.seatQuantity, { baseMonthlyPrice: plan.baseMonthlyPrice, userMonthlyPrice: plan.userMonthlyPrice, price: plan.price, includedUnits: plan.includedUnits }, subscription.couponType && !(subscription.couponCyclesLeft !== null && subscription.couponCyclesLeft <= 0) ? couponDiscount({ type: subscription.couponType, value: subscription.couponValue }) : null);
        const asaasSubscriptionId = subscription.asaasSubscriptionId || subscription.company.asaasSubscriptionId;
        if (asaasSubscriptionId && this.asaas.isConfigured()) await this.asaas.updateSubscription(asaasSubscriptionId, { value: quote.total });
        await this.platformFinance.syncMercadoPagoAmount(subscription.companyId, quote.total);
        await this.prisma.$transaction([
          this.prisma.company.update({ where: { id: subscription.companyId }, data: { platformPlanId: plan.id } }),
          this.prisma.companySubscription.update({
            where: { id: subscription.id },
            data: { planId: plan.id, pendingPlanId: null, pricingVersion: plan.pricingVersion, baseMonthlyPrice: plan.baseMonthlyPrice, userMonthlyPrice: plan.userMonthlyPrice, discountPercent: plan.discountPercent },
          }),
        ]);
      } catch (error) {
        this.logger.error(`Falha ao aplicar troca de plano agendada da empresa ${subscription.companyId}: ${String(error)}`);
      }
    }
  }
  // Gera uma proposta recuperável cinco dias antes do fim do trial.
  @Cron('30 3 * * *')
  @CronLock('billing.createTrialConversionProposals', 3600)
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
          monthlyPrice: this.pricing.calculate(1, company.subscription!.seatQuantity, { baseMonthlyPrice: plan.baseMonthlyPrice, userMonthlyPrice: plan.userMonthlyPrice, price: plan.price, includedUnits: plan.includedUnits }).total,
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
  @CronLock('billing.checkExpiredTrials', 3600)
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
  @CronLock('billing.checkExpiredManualContracts', 3600)
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
  @CronLock('billing.checkOverdueInvoices', 3600)
  async checkOverdueInvoices() {
    this.logger.log('Iniciando rotina de verificação de inadimplência...');

    try {
      const overdueInvoices = await this.prisma.platformInvoice.findMany({
        where: { status: 'OVERDUE' },
        include: { company: true },
        orderBy: { dueDate: 'asc' },
      });

      const today = new Date();
      const dunning = dunningConfigFromEnv();
      const checkedCompanies = new Set<string>();

      for (const invoice of overdueInvoices) {
        const company = invoice.company;

        // Só a fatura mais antiga de cada empresa define o estágio. Cancelada é definitivo; suspensa por outro motivo não é mexida.
        const suspendedByDebt = company.status === 'SUSPENDED' && company.suspensionReason === 'inadimplencia';
        if (company.billingStatus === 'CANCELED' || (company.status === 'SUSPENDED' && !suspendedByDebt) || checkedCompanies.has(company.id)) {
          continue;
        }

        checkedCompanies.add(company.id);

        const dueDate = new Date(invoice.dueDate);
        const timeDiff = today.getTime() - dueDate.getTime();
        const diffDays = Math.floor(timeDiff / (1000 * 3600 * 24));
        const stage = dunningStage(diffDays, dunning);

        if (stage === 'CANCEL') {
          this.logger.warn(`Empresa ${company.id} com fatura atrasada há ${diffDays} dias. Cancelando...`);
          // Se o provedor falhar, a empresa continua elegível para nova tentativa.
          await this.platformFinance.cancelMercadoPagoSubscription(company.id);
          await this.prisma.company.update({
            where: { id: company.id },
            data: { status: 'SUSPENDED', billingStatus: 'CANCELED', isActive: false, suspensionReason: 'cancelamento_por_inadimplencia' },
          });
        } else if (stage === 'BLOCK' && !suspendedByDebt) {
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
  @CronLock('billing.sendPaymentReminders', 3600)
  async sendPaymentReminders() {
    this.logger.log('Iniciando rotina de lembretes de vencimento...');

    try {
      const reminderDaysBefore = parseInt(process.env.FINANCE_NOTIFICATION_REMINDER_DAYS_BEFORE ?? '3', 10);
      const overdueDays = (process.env.FINANCE_NOTIFICATION_OVERDUE_DAYS ?? '1,5,10')
        .split(',')
        .map(d => parseInt(d.trim(), 10))
        .filter(d => !isNaN(d));

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // dias de calendario em UTC: independe do fuso do servidor

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
        dueDate.setUTCHours(0, 0, 0, 0);

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
