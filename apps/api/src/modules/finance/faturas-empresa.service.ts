import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { couponDiscount } from '../coupons/coupon-rules';
import { AsaasService } from './asaas.service';
import { PricingService } from './pricing.service';

/** Tenta o provedor e devolve null em falha: a tela mostra o que existir em vez de quebrar. */
async function attempt<T>(logger: Logger, label: string, run: () => Promise<T>): Promise<T | null> {
  try { return await run(); } catch (error) { logger.warn(`${label}: ${String(error)}`); return null; }
}

/**
 * Faturas da própria empresa, no estilo "banco": plano, uso, faturas com boleto/Pix, recibo, nota fiscal e pedido de reembolso.
 * Pagamento, boleto, Pix, recibo e NFS-e vêm do Asaas.
 */
@Injectable()
export class FaturasEmpresaService {
  private readonly logger = new Logger(FaturasEmpresaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
    private readonly pricing: PricingService,
  ) {}

  async resumo(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, status: true, billingStatus: true, trialEndsAt: true, suspensionReason: true, subscription: true, platformPlan: true },
    });
    if (!company) throw new NotFoundException('Empresa nao encontrada.');
    const sub = company.subscription;
    const plan = company.platformPlan;

    const [users, employees, open] = await Promise.all([
      this.prisma.user.count({ where: { companyId, isActive: true, role: { in: ['RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] } } }),
      this.prisma.employee.count({ where: { companyId, status: { not: 'TERMINATED' } } }),
      this.prisma.platformInvoice.findMany({ where: { companyId, deletedAt: null, status: { in: ['OPEN', 'OVERDUE'] } }, orderBy: { dueDate: 'asc' }, select: { id: true, amount: true, dueDate: true, status: true, description: true } }),
    ]);

    let quote: { total: number; couponDiscount: number } | null = null;
    if (plan && !plan.isFree) {
      const coupon = sub?.couponType && (sub.couponCyclesLeft ?? 1) > 0 ? couponDiscount({ type: sub.couponType, value: sub.couponValue }) : null;
      const q = this.pricing.calculate((plan.commitmentMonths as 1 | 3 | 6 | 12) || 1, sub?.seatQuantity || 1, { baseMonthlyPrice: plan.baseMonthlyPrice, userMonthlyPrice: plan.userMonthlyPrice, price: plan.price, includedUnits: plan.includedUnits }, coupon);
      quote = { total: Number(q.total), couponDiscount: Number(q.couponDiscount ?? 0) };
    }
    const overdue = open.filter((i) => i.status === 'OVERDUE');
    const pendingPlan = sub?.pendingPlanId ? await this.prisma.platformPlan.findUnique({ where: { id: sub.pendingPlanId }, select: { name: true } }) : null;

    return {
      company: { name: company.name, status: company.status, billingStatus: company.billingStatus, trialEndsAt: company.trialEndsAt, suspensionReason: company.suspensionReason },
      plan: plan ? { id: plan.id, name: plan.name, description: plan.description, commitmentMonths: plan.commitmentMonths, maxUsers: plan.maxUsers, maxEmployees: plan.maxEmployees, activeModules: plan.activeModules, isFree: plan.isFree } : null,
      subscription: sub ? {
        status: sub.status, seatQuantity: sub.seatQuantity, pendingSeatQuantity: sub.pendingSeatQuantity, pendingPlanName: pendingPlan?.name ?? null,
        nextDueDate: sub.nextDueDate, currentPeriodEnd: sub.currentPeriodEnd, cancelAt: sub.cancelAt, billingPaused: sub.billingPaused,
        couponType: sub.couponType, couponValue: sub.couponValue ? Number(sub.couponValue) : null, couponCyclesLeft: sub.couponCyclesLeft,
      } : null,
      pricing: quote ? { monthlyTotal: quote.total, discount: quote.couponDiscount, seatQuantity: sub?.seatQuantity ?? 1 } : null,
      usage: { users, maxUsers: sub?.seatQuantity ?? plan?.maxUsers ?? null, employees, maxEmployees: plan?.maxEmployees ?? null },
      invoices: {
        openCount: open.length, openTotal: open.reduce((s, i) => s + Number(i.amount), 0), overdueCount: overdue.length,
        next: open[0] ? { id: open[0].id, amount: Number(open[0].amount), dueDate: open[0].dueDate, status: open[0].status, description: open[0].description } : null,
      },
      asaasReady: this.asaas.isConfigured(),
    };
  }

  private async ownInvoice(companyId: string, invoiceId: string) {
    const invoice = await this.prisma.platformInvoice.findFirst({ where: { id: invoiceId, companyId, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Fatura nao encontrada.');
    return invoice;
  }

  /** Tudo para pagar ou consultar uma fatura: boleto (linha digitável), Pix, recibo e nota fiscal. */
  async detalhes(companyId: string, invoiceId: string) {
    const invoice = await this.ownInvoice(companyId, invoiceId);
    const open = invoice.status === 'OPEN' || invoice.status === 'OVERDUE';
    const viaAsaas = invoice.provider !== 'MERCADOPAGO' && Boolean(invoice.asaasPaymentId) && this.asaas.isConfigured();
    const paymentId = invoice.asaasPaymentId;

    const [charge, boleto, pix, fiscalList] = viaAsaas && paymentId ? await Promise.all([
      attempt(this.logger, 'cobranca', () => this.asaas.getCharge(paymentId)),
      open && ['BOLETO', 'UNDEFINED'].includes(invoice.billingType) ? attempt(this.logger, 'boleto', () => this.asaas.getIdentificationField(paymentId)) : Promise.resolve(null),
      open && ['PIX', 'UNDEFINED'].includes(invoice.billingType) ? attempt(this.logger, 'pix', () => this.asaas.getPixQrCode(paymentId)) : Promise.resolve(null),
      attempt(this.logger, 'nota fiscal', () => this.asaas.listInvoicesByPayment(paymentId)),
    ]) : [null, null, null, null];

    const nfse = fiscalList?.data?.find((n) => n.pdfUrl || n.xmlUrl || n.number);
    const fiscal = invoice.fiscalPdfUrl || invoice.fiscalXmlUrl || invoice.invoiceNumber || nfse
      ? { number: invoice.invoiceNumber ?? nfse?.number ?? null, pdfUrl: invoice.fiscalPdfUrl ?? nfse?.pdfUrl ?? null, xmlUrl: invoice.fiscalXmlUrl ?? nfse?.xmlUrl ?? null }
      : null;

    return {
      invoice: { id: invoice.id, description: invoice.description, amount: Number(invoice.amount), dueDate: invoice.dueDate, status: invoice.status, paidAt: invoice.paidAt, billingType: invoice.billingType, provider: invoice.provider },
      canPay: open,
      payment: open ? {
        paymentPageUrl: charge?.invoiceUrl ?? invoice.invoiceUrl ?? null,
        bankSlipUrl: charge?.bankSlipUrl ?? null,
        barcode: boleto?.identificationField ?? null,
        pixPayload: pix?.payload ?? null,
        pixQrImage: pix?.encodedImage ? `data:image/png;base64,${pix.encodedImage}` : null,
        pixExpiresAt: pix?.expirationDate ?? null,
      } : null,
      receiptUrl: invoice.receiptUrl ?? charge?.transactionReceiptUrl ?? (invoice.status === 'PAID' ? charge?.invoiceUrl ?? invoice.invoiceUrl : null) ?? null,
      fiscal,
      asaasReady: this.asaas.isConfigured(),
    };
  }

  /** Pedido de reembolso: abre um chamado de cobrança para o financeiro analisar (não devolve dinheiro sozinho). */
  async pedirReembolso(companyId: string, invoiceId: string, reason: string, actor: JwtUser) {
    const invoice = await this.ownInvoice(companyId, invoiceId);
    if (invoice.status !== 'PAID') throw new BadRequestException('Só é possível pedir reembolso de fatura paga.');
    const tag = `[REEMBOLSO fatura ${invoice.id}]`;
    const existing = await this.prisma.supportTicket.findFirst({ where: { companyId, title: { contains: invoice.id }, status: { notIn: ['RESOLVED', 'CLOSED'] as any } }, select: { ticketNumber: true } });
    if (existing) throw new BadRequestException(`Já existe um pedido de reembolso em andamento para esta fatura (${existing.ticketNumber}).`);

    const user = await this.prisma.user.findUnique({ where: { id: actor.sub }, select: { name: true, email: true } });
    const year = new Date().getFullYear();
    const counter = await this.prisma.$transaction(async (tx) => {
      const current = await tx.supportTicketCounter.findUnique({ where: { year } });
      return current ? tx.supportTicketCounter.update({ where: { year }, data: { lastNumber: { increment: 1 } } }) : tx.supportTicketCounter.create({ data: { year, lastNumber: 1 } });
    });
    const ticketNumber = `SUP-${year}-${String(counter.lastNumber).padStart(6, '0')}`;
    const brl = Number(invoice.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber, companyId, createdByUserId: actor.sub, requesterName: user?.name ?? actor.name, requesterEmail: user?.email ?? actor.email,
        source: 'AUTHENTICATED', category: 'BILLING', priority: 'HIGH',
        title: `${tag} ${brl}`,
        description: `Pedido de reembolso da fatura "${invoice.description ?? 'Mensalidade'}" no valor de ${brl}, paga em ${invoice.paidAt ? invoice.paidAt.toLocaleDateString('pt-BR') : 'data não registrada'}.\n\nMotivo informado pelo cliente:\n${reason.trim()}`,
        affectedArea: 'Faturas', impact: 'Financeiro',
      },
      select: { id: true, ticketNumber: true },
    });
    await this.prisma.supportTicketEvent.create({ data: { ticketId: ticket.id, actorUserId: actor.sub, eventType: 'TICKET_CREATED', metadata: { source: 'FATURAS', invoiceId: invoice.id } } });
    await this.prisma.auditLog.create({ data: { companyId, userId: actor.sub, action: 'FATURAS_REFUND_REQUESTED', entity: 'PlatformInvoice', entityId: invoice.id, metadata: { ticket: ticket.ticketNumber, reason: reason.trim(), actorEmail: actor.email } } });
    return { ticketNumber: ticket.ticketNumber };
  }

  /** Planos que a empresa pode contratar (sem os ocultos), com preço para a quantidade atual de usuários. */
  async planos(companyId: string) {
    const [plans, sub] = await Promise.all([
      this.prisma.platformPlan.findMany({ where: { isActive: true, isHidden: false }, orderBy: { displayOrder: 'asc' } }),
      this.prisma.companySubscription.findUnique({ where: { companyId }, select: { seatQuantity: true, planId: true } }),
    ]);
    const seats = sub?.seatQuantity || 1;
    return plans.map((p) => {
      let monthlyTotal: number | null = null;
      if (!p.isFree) {
        try { monthlyTotal = Number(this.pricing.calculate((p.commitmentMonths as 1 | 3 | 6 | 12) || 1, seats, { baseMonthlyPrice: p.baseMonthlyPrice, userMonthlyPrice: p.userMonthlyPrice, price: p.price, includedUnits: p.includedUnits }).total); } catch { monthlyTotal = null; }
      } else monthlyTotal = 0;
      return { id: p.id, name: p.name, description: p.description, maxUsers: p.maxUsers, maxEmployees: p.maxEmployees, commitmentMonths: p.commitmentMonths, activeModules: p.activeModules, isFree: p.isFree, isRecommended: p.isRecommended, monthlyTotal, current: p.id === sub?.planId };
    });
  }
}
