import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { couponDiscount } from '../coupons/coupon-rules';
import { AsaasService } from './asaas.service';
import { MercadoPagoService } from './mercadopago.service';
import { PlatformFinanceService } from './platform-finance.service';
import { PricingService } from './pricing.service';
import { prorateUpgrade } from './proration';
import type { CreatePlatformInvoiceDto, UpdatePlatformInvoiceDto } from './dto/platform-finance.dto';
import type { AttachFiscalDto, DiscountInvoiceDto, FreeDaysDto, PartialRefundDto, RecurringDiscountDto } from './dto/faturas.dto';

const DAY_MS = 86_400_000;
const round2 = (value: number) => Math.round(value * 100) / 100;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** Ações de dinheiro da aba Faturas. Cada ação grava o livro de ajustes (com motivo) e a auditoria. */
@Injectable()
export class FaturasAcoesService {
  private readonly logger = new Logger(FaturasAcoesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: PlatformFinanceService,
    private readonly asaas: AsaasService,
    private readonly mercadoPago: MercadoPagoService,
    private readonly pricing: PricingService,
  ) {}

  // ---------- acesso ----------

  /** Comercial só mexe nas empresas da própria carteira. */
  async assertCompany(actor: JwtUser, companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, ...(actor.role === 'COMERCIAL' ? { commercialOwnerId: actor.sub } : {}) },
      select: { id: true },
    });
    if (!company) throw new NotFoundException('Empresa nao encontrada.');
  }

  private async invoiceFor(actor: JwtUser, invoiceId: string) {
    const invoice = await this.prisma.platformInvoice.findFirst({ where: { id: invoiceId, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Fatura nao encontrada.');
    await this.assertCompany(actor, invoice.companyId);
    return invoice;
  }

  private async record(
    actor: JwtUser,
    entry: { companyId: string; invoiceId?: string; type: Prisma.InvoiceAdjustmentCreateInput['type']; amount?: number; days?: number; reason: string; metadata?: Prisma.InputJsonValue },
  ) {
    const created = await this.prisma.invoiceAdjustment.create({
      data: { ...entry, createdById: actor.sub },
    });
    await this.prisma.auditLog.create({
      data: {
        companyId: entry.companyId,
        userId: actor.sub,
        action: `FATURAS_${entry.type}`,
        entity: 'InvoiceAdjustment',
        entityId: created.id,
        metadata: { invoiceId: entry.invoiceId ?? null, amount: entry.amount ?? null, days: entry.days ?? null, reason: entry.reason, actorEmail: actor.email, ...((entry.metadata as object) ?? {}) },
      },
    });
    return created;
  }

  listAdjustments(companyId: string) {
    return this.prisma.invoiceAdjustment.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  // ---------- cobrança avulsa / cancelar ----------

  async charge(dto: CreatePlatformInvoiceDto, actor: JwtUser) {
    await this.assertCompany(actor, dto.companyId);
    const invoice = await this.finance.create(dto);
    await this.prisma.auditLog.create({
      data: { companyId: dto.companyId, userId: actor.sub, action: 'FATURAS_CHARGE_CREATED', entity: 'PlatformInvoice', entityId: invoice.id, metadata: { amount: Number(dto.amount), description: dto.description, actorEmail: actor.email } },
    });
    return invoice;
  }

  async cancelInvoice(invoiceId: string, reason: string, actor: JwtUser) {
    const invoice = await this.invoiceFor(actor, invoiceId);
    if (invoice.status === 'PAID') throw new BadRequestException('Fatura paga nao pode ser cancelada. Use o reembolso.');
    const result = await this.finance.remove(invoiceId, actor);
    await this.prisma.auditLog.create({
      data: { companyId: invoice.companyId, userId: actor.sub, action: 'FATURAS_INVOICE_CANCELED_REASON', entity: 'PlatformInvoice', entityId: invoiceId, metadata: { reason, actorEmail: actor.email } },
    });
    return result;
  }

  // ---------- desconto ----------

  /** Desconto pontual numa fatura ainda nao paga (Asaas). */
  async discountInvoice(invoiceId: string, dto: DiscountInvoiceDto, actor: JwtUser) {
    const invoice = await this.invoiceFor(actor, invoiceId);
    if (invoice.status !== 'OPEN' && invoice.status !== 'OVERDUE') throw new BadRequestException('So e possivel dar desconto em fatura aberta ou vencida.');
    if (invoice.provider === 'MERCADOPAGO') throw new BadRequestException('O link do Mercado Pago tem valor fixo. Cancele a fatura e gere uma nova com o valor final.');
    const previous = Number(invoice.amount);
    if (dto.kind === 'PERCENT' && dto.value >= 100) throw new BadRequestException('Desconto percentual deve ser menor que 100%. Para zerar, cancele a fatura.');
    const next = round2(dto.kind === 'PERCENT' ? previous * (1 - dto.value / 100) : previous - dto.value);
    if (next <= 0) throw new BadRequestException('O desconto zera a fatura. Cancele a fatura em vez de dar desconto.');

    const updated = await this.finance.update(invoiceId, { amount: next } as UpdatePlatformInvoiceDto);
    await this.record(actor, {
      companyId: invoice.companyId, invoiceId, type: 'DISCOUNT', amount: round2(previous - next), reason: dto.reason,
      metadata: { kind: dto.kind, value: dto.value, previousAmount: previous, nextAmount: next },
    });
    return updated;
  }

  /** Desconto recorrente por N ciclos: grava na assinatura e atualiza o valor no provedor. */
  async recurringDiscount(companyId: string, dto: RecurringDiscountDto, actor: JwtUser) {
    await this.assertCompany(actor, companyId);
    if (dto.kind === 'PERCENT' && dto.value >= 100) throw new BadRequestException('Desconto percentual deve ser menor que 100%.');
    const sub = await this.prisma.companySubscription.findUnique({ where: { companyId }, include: { plan: true } });
    if (!sub?.plan) throw new NotFoundException('Assinatura ativa nao encontrada.');

    const coupon = couponDiscount({ type: dto.kind, value: dto.value });
    const quote = this.pricing.calculate(sub.plan.commitmentMonths as 1 | 3 | 6 | 12, sub.seatQuantity,
      { baseMonthlyPrice: sub.plan.baseMonthlyPrice, userMonthlyPrice: sub.plan.userMonthlyPrice, price: sub.plan.price }, coupon);
    if (quote.total <= 0) throw new BadRequestException('O desconto zera a mensalidade.');

    const providerSynced = await this.syncRecurringAmount(sub, quote.total);
    await this.prisma.companySubscription.update({
      where: { companyId },
      data: { couponId: null, couponType: dto.kind, couponValue: dto.value, couponCyclesLeft: dto.cycles },
    });
    await this.record(actor, {
      companyId, type: 'RECURRING_DISCOUNT', amount: quote.couponDiscount, reason: dto.reason,
      metadata: { kind: dto.kind, value: dto.value, cycles: dto.cycles, previousCoupon: { type: sub.couponType, value: sub.couponValue ? Number(sub.couponValue) : null, cyclesLeft: sub.couponCyclesLeft }, newTotal: quote.total, providerSynced },
    });
    return { total: quote.total, discountPerCycle: quote.couponDiscount, cycles: dto.cycles, providerSynced };
  }

  private async syncRecurringAmount(sub: { asaasSubscriptionId: string | null; mpPreapprovalId: string | null; companyId: string }, total: number) {
    let synced = false;
    const company = await this.prisma.company.findUnique({ where: { id: sub.companyId }, select: { asaasSubscriptionId: true } });
    const asaasId = sub.asaasSubscriptionId || company?.asaasSubscriptionId;
    if (asaasId && this.asaas.isConfigured()) { await this.asaas.updateSubscription(asaasId, { value: total }); synced = true; }
    if (sub.mpPreapprovalId && this.mercadoPago.isConfigured()) { await this.mercadoPago.updateSubscriptionAmount(sub.mpPreapprovalId, total); synced = true; }
    return synced;
  }

  // ---------- dias / meses gratis ----------

  async freeDays(companyId: string, dto: FreeDaysDto, actor: JwtUser) {
    await this.assertCompany(actor, companyId);
    const sub = await this.prisma.companySubscription.findUnique({ where: { companyId } });
    if (!sub) throw new NotFoundException('Assinatura nao encontrada.');
    const shift = dto.days * DAY_MS;
    const now = new Date();
    const previousDue = sub.nextDueDate ?? sub.currentPeriodEnd ?? now;
    const nextDue = new Date(Math.max(previousDue.getTime(), now.getTime()) + shift);

    let providerSynced = false;
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { asaasSubscriptionId: true } });
    const asaasId = sub.asaasSubscriptionId || company?.asaasSubscriptionId;
    if (asaasId && this.asaas.isConfigured()) {
      await this.asaas.updateSubscription(asaasId, { nextDueDate: isoDay(nextDue) });
      providerSynced = true;
    }

    await this.prisma.companySubscription.update({
      where: { companyId },
      data: {
        nextDueDate: nextDue,
        ...(sub.currentPeriodEnd ? { currentPeriodEnd: new Date(sub.currentPeriodEnd.getTime() + shift) } : {}),
        ...(sub.trialEndsAt && sub.trialEndsAt > now ? { trialEndsAt: new Date(sub.trialEndsAt.getTime() + shift) } : {}),
      },
    });

    // Faturas abertas e ainda nao vencidas acompanham o novo vencimento.
    const upcoming = await this.prisma.platformInvoice.findMany({ where: { companyId, status: 'OPEN', deletedAt: null, dueDate: { gte: now } } });
    const moved: string[] = [];
    for (const inv of upcoming) {
      try {
        await this.finance.update(inv.id, { dueDate: isoDay(new Date(inv.dueDate.getTime() + shift)) } as UpdatePlatformInvoiceDto);
        moved.push(inv.id);
      } catch (error) {
        this.logger.warn(`Nao foi possivel mover o vencimento da fatura ${inv.id}: ${String(error)}`);
      }
    }

    await this.record(actor, {
      companyId, type: 'FREE_DAYS', days: dto.days, reason: dto.reason,
      metadata: { previousDueDate: previousDue.toISOString(), nextDueDate: nextDue.toISOString(), movedInvoices: moved, providerSynced },
    });
    return { nextDueDate: nextDue, movedInvoices: moved.length, providerSynced };
  }

  // ---------- reembolso parcial ----------

  async partialRefund(invoiceId: string, dto: PartialRefundDto, actor: JwtUser) {
    const invoice = await this.invoiceFor(actor, invoiceId);
    if (invoice.status !== 'PAID') throw new BadRequestException('A fatura precisa estar paga para ser reembolsada.');
    const agg = await this.prisma.invoiceAdjustment.aggregate({ where: { invoiceId, type: 'PARTIAL_REFUND' }, _sum: { amount: true } });
    const already = Number(agg._sum.amount ?? 0);
    const available = round2(Number(invoice.amount) - already);
    if (dto.amount > available) throw new BadRequestException(`Valor acima do disponivel para reembolso (R$ ${available.toFixed(2)}).`);

    try {
      if (invoice.provider === 'MERCADOPAGO' && invoice.mpPaymentId) await this.mercadoPago.refund(invoice.mpPaymentId, dto.amount);
      else if (invoice.asaasPaymentId) await this.asaas.refundPayment(invoice.asaasPaymentId, dto.amount, dto.reason);
      else throw new BadRequestException('Esta fatura nao tem pagamento no provedor. Reembolse manualmente e registre fora do sistema.');
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Falha no reembolso parcial da fatura ${invoiceId}: ${String(error)}`);
      throw new BadRequestException('O provedor recusou o reembolso. Confira o prazo e o saldo.');
    }

    return this.record(actor, {
      companyId: invoice.companyId, invoiceId, type: 'PARTIAL_REFUND', amount: dto.amount, reason: dto.reason,
      metadata: { provider: invoice.provider, remainingRefundable: round2(available - dto.amount) },
    });
  }

  /** Reembolso total: mantem a regra existente (estorno + suspensao conforme a janela de 7 dias). */
  async fullRefund(invoiceId: string, reason: string, actor: JwtUser) {
    const invoice = await this.invoiceFor(actor, invoiceId);
    const result = await this.finance.requestRefund(invoiceId, invoice.companyId, actor);
    await this.prisma.auditLog.create({
      data: { companyId: invoice.companyId, userId: actor.sub, action: 'FATURAS_FULL_REFUND_REASON', entity: 'PlatformInvoice', entityId: invoiceId, metadata: { reason, actorEmail: actor.email } },
    });
    return result;
  }

  // ---------- usuarios (upgrade/downgrade) com rateio ----------

  private async seatsContext(companyId: string, seatQuantity: number) {
    const sub = await this.prisma.companySubscription.findUnique({ where: { companyId }, include: { plan: true } });
    if (!sub?.plan) throw new NotFoundException('Assinatura ativa nao encontrada.');
    const coupon = sub.couponType && !(sub.couponCyclesLeft !== null && sub.couponCyclesLeft <= 0) ? couponDiscount({ type: sub.couponType, value: sub.couponValue }) : null;
    const prices = { baseMonthlyPrice: sub.plan.baseMonthlyPrice, userMonthlyPrice: sub.plan.userMonthlyPrice, price: sub.plan.price };
    const months = sub.plan.commitmentMonths as 1 | 3 | 6 | 12;
    const current = this.pricing.calculate(months, sub.seatQuantity, prices, coupon);
    const next = this.pricing.calculate(months, seatQuantity, prices, coupon);
    const periodEnd = sub.nextDueDate ?? sub.currentPeriodEnd;
    const proration = periodEnd && seatQuantity > sub.seatQuantity
      ? prorateUpgrade({ currentTotal: current.total, nextTotal: next.total, periodStart: sub.currentPeriodStart, periodEnd })
      : { amount: 0, remainingDays: 0, cycleDays: 0 };
    return { sub, current, next, proration, periodEnd };
  }

  async quoteSeats(companyId: string, seatQuantity: number, actor: JwtUser) {
    await this.assertCompany(actor, companyId);
    const { sub, current, next, proration, periodEnd } = await this.seatsContext(companyId, seatQuantity);
    return {
      currentSeats: sub.seatQuantity, nextSeats: seatQuantity, currentTotal: current.total, nextTotal: next.total,
      kind: seatQuantity > sub.seatQuantity ? 'UPGRADE' : seatQuantity < sub.seatQuantity ? 'DOWNGRADE' : 'SEM_MUDANCA',
      prorationAmount: proration.amount, remainingDays: proration.remainingDays, cycleDays: proration.cycleDays,
      periodEnd, downgradeEffectiveAt: seatQuantity < sub.seatQuantity ? periodEnd : null,
    };
  }

  /** Upgrade vale na hora e cobra o rateio por dia; downgrade fica agendado para o proximo ciclo, sem credito. */
  async changeSeats(companyId: string, seatQuantity: number, reason: string, actor: JwtUser) {
    await this.assertCompany(actor, companyId);
    const { sub, proration } = await this.seatsContext(companyId, seatQuantity);
    const previousSeats = sub.seatQuantity;
    const result = await this.finance.changeSeatQuantity(companyId, seatQuantity, actor);

    let invoice: { id: string; invoiceUrl?: string | null } | null = null;
    if (result.changed && !result.scheduled && proration.amount > 0) {
      const due = new Date(Date.now() + 3 * DAY_MS);
      invoice = await this.finance.create({
        companyId, planId: sub.planId ?? undefined, amount: proration.amount, dueDate: due.toISOString(), billingType: 'UNDEFINED', sendToAsaas: true,
        description: `Rateio de upgrade: ${previousSeats} para ${seatQuantity} usuarios (${proration.remainingDays} de ${proration.cycleDays} dias)`,
      } as CreatePlatformInvoiceDto);
    }
    await this.record(actor, {
      companyId, invoiceId: invoice?.id, type: 'PRORATION', amount: invoice ? proration.amount : 0, reason,
      metadata: { previousSeats, nextSeats: seatQuantity, scheduled: Boolean(result.scheduled), remainingDays: proration.remainingDays, cycleDays: proration.cycleDays },
    });
    return { ...result, prorationAmount: invoice ? proration.amount : 0, prorationInvoice: invoice };
  }

  // ---------- troca de plano (mesmo ciclo) com rateio ----------

  private async planContext(companyId: string, planId: string) {
    const sub = await this.prisma.companySubscription.findUnique({ where: { companyId }, include: { plan: true } });
    if (!sub?.plan) throw new NotFoundException('Assinatura ativa nao encontrada.');
    const next = await this.prisma.platformPlan.findUnique({ where: { id: planId } });
    if (!next) throw new NotFoundException('Plano nao encontrado.');
    if (!next.isActive) throw new BadRequestException('Este plano nao esta mais disponivel.');
    if (next.id === sub.plan.id) throw new BadRequestException('A empresa ja esta neste plano.');
    if (next.commitmentMonths !== sub.plan.commitmentMonths) {
      throw new BadRequestException('Planos com ciclos de cobranca diferentes nao podem ser trocados por aqui. Faca a troca em Assinaturas.');
    }
    const coupon = sub.couponType && !(sub.couponCyclesLeft !== null && sub.couponCyclesLeft <= 0) ? couponDiscount({ type: sub.couponType, value: sub.couponValue }) : null;
    const months = sub.plan.commitmentMonths as 1 | 3 | 6 | 12;
    const priceOf = (p: typeof next) => this.pricing.calculate(months, sub.seatQuantity, { baseMonthlyPrice: p.baseMonthlyPrice, userMonthlyPrice: p.userMonthlyPrice, price: p.price }, coupon);
    const current = priceOf(sub.plan);
    const upcoming = priceOf(next);
    const periodEnd = sub.nextDueDate ?? sub.currentPeriodEnd;
    const upgrade = upcoming.total > current.total;
    const proration = periodEnd && upgrade
      ? prorateUpgrade({ currentTotal: current.total, nextTotal: upcoming.total, periodStart: sub.currentPeriodStart, periodEnd })
      : { amount: 0, remainingDays: 0, cycleDays: 0 };
    return { sub, next, current, upcoming, upgrade, proration, periodEnd };
  }

  async quotePlan(companyId: string, planId: string, actor: JwtUser) {
    await this.assertCompany(actor, companyId);
    const { sub, next, current, upcoming, upgrade, proration, periodEnd } = await this.planContext(companyId, planId);
    return {
      currentPlan: sub.plan?.name, nextPlan: next.name, currentTotal: current.total, nextTotal: upcoming.total,
      kind: upgrade ? 'UPGRADE' : 'DOWNGRADE', prorationAmount: proration.amount, remainingDays: proration.remainingDays, cycleDays: proration.cycleDays,
      effectiveAt: upgrade ? null : periodEnd,
    };
  }

  /** Upgrade vale agora e cobra o rateio; downgrade fica agendado para o proximo ciclo (aplicado pelo cron), sem credito. */
  async changePlan(companyId: string, planId: string, reason: string, actor: JwtUser) {
    await this.assertCompany(actor, companyId);
    const { sub, next, upcoming, upgrade, proration } = await this.planContext(companyId, planId);

    if (!upgrade) {
      await this.prisma.companySubscription.update({ where: { companyId }, data: { pendingPlanId: next.id } });
      await this.record(actor, { companyId, type: 'PRORATION', amount: 0, reason, metadata: { kind: 'PLAN_DOWNGRADE_SCHEDULED', fromPlanId: sub.planId, toPlanId: next.id } });
      return { scheduled: true, prorationAmount: 0 };
    }

    const providerSynced = await this.syncRecurringAmount(sub, upcoming.total);
    await this.prisma.$transaction([
      this.prisma.company.update({ where: { id: companyId }, data: { platformPlanId: next.id } }),
      this.prisma.companySubscription.update({
        where: { companyId },
        data: {
          planId: next.id, pendingPlanId: null, pricingVersion: next.pricingVersion,
          baseMonthlyPrice: next.baseMonthlyPrice, userMonthlyPrice: next.userMonthlyPrice, discountPercent: next.discountPercent,
        },
      }),
    ]);

    let invoice: { id: string } | null = null;
    if (proration.amount > 0) {
      invoice = await this.finance.create({
        companyId, planId: next.id, amount: proration.amount, dueDate: new Date(Date.now() + 3 * DAY_MS).toISOString(), billingType: 'UNDEFINED', sendToAsaas: true,
        description: `Rateio de upgrade para o plano ${next.name} (${proration.remainingDays} de ${proration.cycleDays} dias)`,
      } as CreatePlatformInvoiceDto);
    }
    await this.record(actor, {
      companyId, invoiceId: invoice?.id, type: 'PRORATION', amount: invoice ? proration.amount : 0, reason,
      metadata: { kind: 'PLAN_UPGRADE', fromPlanId: sub.planId, toPlanId: next.id, remainingDays: proration.remainingDays, cycleDays: proration.cycleDays, providerSynced },
    });
    return { scheduled: false, prorationAmount: invoice ? proration.amount : 0, providerSynced };
  }

  // ---------- sincronizar / extrato ----------

  async sync(invoiceId: string, actor: JwtUser) {
    await this.invoiceFor(actor, invoiceId);
    return this.finance.sync(invoiceId, actor);
  }

  // ---------- nota fiscal / comprovante manuais ----------

  async attachFiscal(invoiceId: string, dto: AttachFiscalDto, actor: JwtUser) {
    const invoice = await this.invoiceFor(actor, invoiceId);
    if (!dto.invoiceNumber && !dto.fiscalPdfUrl && !dto.fiscalXmlUrl && !dto.receiptUrl) throw new BadRequestException('Informe o numero da nota, um link ou o comprovante.');
    if (invoice.asaasInvoiceId && invoice.invoiceStatus === 'AUTHORIZED' && (dto.invoiceNumber || dto.fiscalPdfUrl || dto.fiscalXmlUrl)) {
      throw new BadRequestException('Esta fatura ja tem nota fiscal autorizada automaticamente pelo Asaas.');
    }
    const fiscal = Boolean(dto.invoiceNumber || dto.fiscalPdfUrl || dto.fiscalXmlUrl);
    const updated = await this.prisma.platformInvoice.update({
      where: { id: invoiceId },
      data: {
        ...(dto.invoiceNumber ? { invoiceNumber: dto.invoiceNumber } : {}),
        ...(dto.fiscalPdfUrl ? { fiscalPdfUrl: dto.fiscalPdfUrl } : {}),
        ...(dto.fiscalXmlUrl ? { fiscalXmlUrl: dto.fiscalXmlUrl } : {}),
        ...(dto.receiptUrl ? { receiptUrl: dto.receiptUrl } : {}),
        ...(fiscal ? { nfeStatus: 'AUTHORIZED', invoiceStatus: 'AUTHORIZED', invoiceAuthorizedAt: invoice.invoiceAuthorizedAt ?? new Date() } : {}),
      },
    });
    await this.record(actor, {
      companyId: invoice.companyId, invoiceId, type: 'FISCAL_ATTACHED', reason: dto.reason,
      metadata: { invoiceNumber: dto.invoiceNumber ?? null, fiscalPdfUrl: dto.fiscalPdfUrl ?? null, fiscalXmlUrl: dto.fiscalXmlUrl ?? null, receiptUrl: dto.receiptUrl ?? null, previousNumber: invoice.invoiceNumber },
    });
    return updated;
  }
}
