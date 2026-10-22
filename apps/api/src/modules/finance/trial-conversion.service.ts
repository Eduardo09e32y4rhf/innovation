import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { escapeHtml, layout } from '../mail/mail-templates';
import { NotificationsService } from '../notifications/notifications.service';
import { couponDiscount } from '../coupons/coupon-rules';
import { computePrice, planPricingForSubscription, saoPauloDayNumber } from './pricing';
import { PlatformFinanceService } from './platform-finance.service';
import { trialCountdownContent, trialCountdownKey, trialCountdownStage, trialDaysLeft } from './trial-lifecycle';

const DAY_MS = 86_400_000;
const spDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date);

export type FirstInvoiceResult =
  | { created: true; invoiceId: string; amountCents: number }
  | { created: false; reason: 'NO_COMPANY' | 'FREE_OR_NO_PLAN' | 'PROVIDER_RECURRING' | 'ALREADY_CREATED' | 'ZERO_AMOUNT'; invoiceId?: string };

/** Conversão do teste grátis: primeira fatura direta (sem proposta) e avisos de 7, 3 e 1 dia antes do fim. */
@Injectable()
export class TrialConversionService {
  private readonly logger = new Logger(TrialConversionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformFinance: PlatformFinanceService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  /**
   * Primeira fatura ao fim do teste, calculada por `computePrice`. Idempotente por empresa e ciclo
   * (chave `first-invoice:<empresa>:<data de fim do teste>` na fatura). Se a empresa já tem recorrência no Asaas/Mercado Pago,
   * o próprio provedor cobra no vencimento e nada é gerado aqui (evita cobrança em dobro).
   */
  async generateFirstInvoice(companyId: string, now: Date = new Date()): Promise<FirstInvoiceResult> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, trialEndsAt: true, asaasSubscriptionId: true, platformPlan: true, subscription: true },
    });
    if (!company) return { created: false, reason: 'NO_COMPANY' };
    const plan = company.platformPlan;
    const sub = company.subscription;
    if (!plan || plan.isFree) return { created: false, reason: 'FREE_OR_NO_PLAN' };
    if (company.asaasSubscriptionId || sub?.asaasSubscriptionId || sub?.mpPreapprovalId) return { created: false, reason: 'PROVIDER_RECURRING' };

    const key = `first-invoice:${company.id}:${spDate(company.trialEndsAt ?? sub?.trialEndsAt ?? now)}`;
    const previous = await this.prisma.platformInvoice.findUnique({ where: { chargeRequestKey: key }, select: { id: true } });
    if (previous) return { created: false, reason: 'ALREADY_CREATED', invoiceId: previous.id };

    const coupon = sub?.couponType && !(sub.couponCyclesLeft !== null && sub.couponCyclesLeft !== undefined && sub.couponCyclesLeft <= 0)
      ? couponDiscount({ type: sub.couponType, value: sub.couponValue })
      : null;
    const price = computePrice({ plan: planPricingForSubscription(plan, sub), units: sub?.seatQuantity || 1, coupon, now });
    if (price.totalCents <= 0) return { created: false, reason: 'ZERO_AMOUNT' };

    const dueDate = new Date(Math.round(saoPauloDayNumber(now) + 3) * DAY_MS);
    let invoice;
    try {
      invoice = await this.prisma.platformInvoice.create({
        data: {
          companyId: company.id, planId: plan.id, description: `Mensalidade ${plan.name} - ${company.name}`,
          amount: price.totalCents / 100, dueDate, status: 'OPEN', billingType: 'UNDEFINED', chargeRequestKey: key,
          paymentProcessingStatus: 'LOCAL', pricingSnapshot: { source: 'TRIAL_CONVERSION', pricingVersion: sub?.pricingVersion ?? plan.pricingVersion ?? null, ...price } as any,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') return { created: false, reason: 'ALREADY_CREATED' };
      throw error;
    }
    try {
      await this.platformFinance.attachFirstInvoiceLink(invoice.id);
    } catch (error) {
      // A fatura local existe e o financeiro a acompanha; o link de pagamento é reconciliado depois.
      this.logger.warn(`Primeira fatura ${invoice.id} sem link de pagamento: ${String(error)}`);
    }
    return { created: true, invoiceId: invoice.id, amountCents: price.totalCents };
  }

  /** Reserva a chave do aviso; false quando já foi enviado (ou está em andamento). Falhas anteriores podem ser repetidas. */
  private async claim(companyId: string, key: string, channel: 'INTERNAL' | 'EMAIL', recipient?: string): Promise<boolean> {
    try {
      await this.prisma.financeNotificationLog.create({ data: { companyId, eventType: 'TRIAL_COUNTDOWN', channel, recipient, status: 'PENDING', idempotencyKey: key } });
      return true;
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
      const retried = await this.prisma.financeNotificationLog.updateMany({ where: { idempotencyKey: key, status: 'FAILED' }, data: { status: 'PENDING', errorMessage: null } });
      return retried.count > 0;
    }
  }

  private finish(key: string, status: 'SENT' | 'FAILED' | 'SKIPPED', error?: string) {
    return this.prisma.financeNotificationLog.update({ where: { idempotencyKey: key }, data: { status, sentAt: status === 'SENT' ? new Date() : null, errorMessage: error ?? null } });
  }

  /** Avisos 7, 3 e 1 dia antes do fim do teste: e-mail para cada administrador e notificação no sistema. Pode rodar a cada hora. */
  async sendCountdownWarnings(now: Date = new Date()): Promise<{ checked: number; internal: number; emails: number }> {
    const subscriptions = await this.prisma.companySubscription.findMany({
      where: {
        status: 'TRIAL', trialDeclinedAt: null,
        trialEndsAt: { gt: now, lte: new Date(now.getTime() + 8 * DAY_MS) },
        company: { isActive: true, billingStatus: 'TRIAL' },
      },
      include: { plan: true, company: { select: { id: true, slug: true, users: { where: { role: 'ADMIN', isActive: true }, select: { name: true, email: true } } } } },
      take: 500,
    });
    const result = { checked: subscriptions.length, internal: 0, emails: 0 };
    for (const sub of subscriptions) {
      const trialEndsAt = sub.trialEndsAt as Date;
      const stage = trialCountdownStage(trialEndsAt, now);
      if (!stage || trialDaysLeft(trialEndsAt, now) !== stage) continue;
      try {
        const price = sub.plan ? computePrice({ plan: planPricingForSubscription(sub.plan, sub), units: sub.seatQuantity || 1, now }) : null;
        const content = trialCountdownContent({ stage, trialEndsAt, planName: sub.plan?.name ?? 'contratado', amount: (price?.cycleTotalCents ?? 0) / 100 });
        const url = `/${sub.company.slug || sub.company.id}/dashboard/faturas`;

        const internalKey = trialCountdownKey({ companyId: sub.companyId, trialEndsAt, stage, channel: 'INTERNAL' });
        if (await this.claim(sub.companyId, internalKey, 'INTERNAL')) {
          try {
            await this.notifications.createSystemNotice(sub.companyId, { ...content, priority: stage === 1 ? 'URGENT' : 'HIGH', targetRoles: ['ADMIN'], source: 'TRIAL_COUNTDOWN', targetUrl: url, expiresAt: trialEndsAt, extraJson: { kind: 'TRIAL_COUNTDOWN', stage, trialEndsAt } });
            await this.finish(internalKey, 'SENT');
            result.internal += 1;
          } catch (error) { await this.finish(internalKey, 'FAILED', String(error)); throw error; }
        }

        for (const admin of sub.company.users) {
          if (!admin.email) continue;
          const key = trialCountdownKey({ companyId: sub.companyId, trialEndsAt, stage, channel: 'EMAIL', recipient: admin.email });
          if (!(await this.claim(sub.companyId, key, 'EMAIL', admin.email))) continue;
          const base = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
          const sent = await this.mail.send(admin.email, {
            subject: `${content.title} — Innovation RH Connect`,
            html: layout(content.title, `<p>Olá, ${escapeHtml(admin.name ?? '')}.</p>${content.message.split('\n\n').map((p) => `<p>${escapeHtml(p)}</p>`).join('')}`, base ? { label: 'Ver faturas', url: `${base}${url}` } : undefined),
            text: `Olá, ${admin.name ?? ''}.\n\n${content.message}${base ? `\n\n${base}${url}` : ''}`,
          });
          await this.finish(key, sent.sent ? 'SENT' : sent.provider === 'none' ? 'SKIPPED' : 'FAILED', sent.error);
          if (sent.sent) result.emails += 1;
        }
      } catch (error) {
        this.logger.error(`Falha no aviso de fim do teste da empresa ${sub.companyId}: ${String(error)}`);
      }
    }
    return result;
  }
}
