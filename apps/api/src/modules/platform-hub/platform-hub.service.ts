import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';

const num = (value: unknown) => Number(value ?? 0);
const mask = (value?: string | null) => (value ? `${value.slice(0, 4)}…${value.slice(-3)}` : null);

/** Empresas visíveis ao perfil: COMERCIAL só enxerga as que ele atende; DEV/CEO/CONTABIL, todas. */
export function companyScope(actor: JwtUser) {
  if (actor.role === 'COMERCIAL') return { commercialOwnerId: actor.sub };
  if (['DEV', 'CEO', 'CONTABIL'].includes(actor.role)) return {};
  throw new ForbiddenException('Seu perfil não tem acesso à Plataforma.');
}

@Injectable()
export class PlatformHubService {
  constructor(private readonly prisma: PrismaService) {}

  /** Seletor leve de empresas (substitui carregar 1000 empresas no navegador). */
  async companies(actor: JwtUser, q?: string) {
    const term = q?.trim();
    return this.prisma.company.findMany({
      where: {
        ...companyScope(actor),
        ...(term ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { document: { contains: term.replace(/\D/g, '') || term } }, { slug: { contains: term, mode: 'insensitive' } }] } : {}),
      },
      select: { id: true, name: true, slug: true, document: true, status: true, plan: true, billingStatus: true },
      orderBy: { name: 'asc' },
      take: 25,
    });
  }

  async overview(actor: JwtUser, companyId?: string) {
    const scope = companyScope(actor);
    if (companyId) {
      const allowed = await this.prisma.company.findFirst({ where: { id: companyId, ...scope }, select: { id: true } });
      if (!allowed) throw new NotFoundException('Empresa não encontrada.');
      return this.companyOverview(actor, companyId);
    }
    return this.globalOverview(actor);
  }

  private monthRange() {
    const now = new Date();
    return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) };
  }

  private async globalOverview(actor: JwtUser) {
    const scope = companyScope(actor);
    const companyIds = scope && Object.keys(scope).length
      ? (await this.prisma.company.findMany({ where: scope, select: { id: true } })).map((item) => item.id)
      : null;
    const byCompany = companyIds ? { companyId: { in: companyIds } } : {};
    const { start, end } = this.monthRange();
    const in7 = new Date(Date.now() + 7 * 86_400_000);
    const since30 = new Date(Date.now() - 30 * 86_400_000);
    const financeAllowed = actor.role !== 'CONTABIL';

    const [byStatus, newCompanies, users, employees, invoicesMonth, overdue, attentionRaw, trials, recentAudit, tickets, webhooks, usage] = await Promise.all([
      this.prisma.company.groupBy({ by: ['status'], where: scope, _count: true }),
      this.prisma.company.count({ where: { ...scope, createdAt: { gte: since30 } } }),
      this.prisma.user.count({ where: { ...(companyIds ? { companyId: { in: companyIds } } : {}), isActive: true } }),
      this.prisma.employee.count({ where: { ...(companyIds ? { companyId: { in: companyIds } } : {}), status: 'ACTIVE' } }),
      financeAllowed ? this.prisma.platformInvoice.groupBy({ by: ['status'], where: { ...byCompany, deletedAt: null, dueDate: { gte: start, lt: end } }, _sum: { amount: true }, _count: true }) : Promise.resolve([]),
      financeAllowed ? this.prisma.platformInvoice.groupBy({ by: ['companyId'], where: { ...byCompany, deletedAt: null, status: 'OVERDUE' }, _sum: { amount: true }, _count: true, orderBy: { _sum: { amount: 'desc' } }, take: 8 }) : Promise.resolve([]),
      this.prisma.company.findMany({ where: { ...scope, status: 'ACTIVE' }, select: { id: true, name: true, maxUsers: true, maxEmployees: true, _count: { select: { users: true, employees: true } } }, take: 600 }),
      this.prisma.company.findMany({ where: { ...scope, billingStatus: 'TRIAL', trialEndsAt: { lte: in7 } }, select: { id: true, name: true, trialEndsAt: true }, orderBy: { trialEndsAt: 'asc' }, take: 8 }),
      this.prisma.auditLog.findMany({ where: { ...byCompany }, select: { id: true, action: true, entity: true, createdAt: true, company: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 8 }),
      actor.role === 'COMERCIAL' || actor.role === 'CONTABIL' ? Promise.resolve(0) : this.prisma.supportTicket.count({ where: { status: { in: ['NEW', 'TRIAGE', 'IN_PROGRESS', 'REOPENED'] } } }),
      actor.role === 'DEV' || actor.role === 'CEO' ? this.prisma.asaasWebhookEvent.count({ where: { status: { in: ['FAILED', 'ERROR'] } } }) : Promise.resolve(0),
      this.prisma.company.groupBy({ by: ['billingStatus'], where: scope, _count: true }),
    ]);

    const names = new Map((await this.prisma.company.findMany({ where: { id: { in: overdue.map((row) => row.companyId) } }, select: { id: true, name: true } })).map((item) => [item.id, item.name]));
    const money = (status: string) => num(invoicesMonth.find((row) => row.status === status)?._sum?.amount);
    const nearLimit = attentionRaw
      .filter((company) => company._count.users >= Math.max(1, company.maxUsers) * 0.9 || company._count.employees >= Math.max(1, company.maxEmployees) * 0.9)
      .slice(0, 8)
      .map((company) => ({ id: company.id, name: company.name, users: company._count.users, maxUsers: company.maxUsers, employees: company._count.employees, maxEmployees: company.maxEmployees }));

    return {
      scope: 'GLOBAL',
      companies: { total: byStatus.reduce((sum, row) => sum + row._count, 0), byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count])), newLast30Days: newCompanies, byBilling: Object.fromEntries(usage.map((row) => [row.billingStatus, row._count])) },
      usage: { users, employees },
      finance: financeAllowed ? { month: start.toISOString().slice(0, 7), received: money('PAID'), open: money('OPEN'), overdue: money('OVERDUE'), invoices: invoicesMonth.reduce((sum, row) => sum + row._count, 0) } : null,
      support: { open: tickets },
      integrations: { webhookFailures: webhooks },
      attention: {
        overdue: overdue.map((row) => ({ companyId: row.companyId, name: names.get(row.companyId) ?? 'Empresa', amount: num(row._sum.amount), invoices: row._count })),
        trials: trials.map((row) => ({ companyId: row.id, name: row.name, endsAt: row.trialEndsAt })),
        nearLimit,
      },
      recentActivity: recentAudit.map((item) => ({ id: item.id, action: item.action, entity: item.entity, at: item.createdAt, company: item.company })),
    };
  }

  private async companyOverview(actor: JwtUser, companyId: string) {
    const { start, end } = this.monthRange();
    const financeAllowed = actor.role !== 'CONTABIL';
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: {
        id: true, name: true, slug: true, document: true, status: true, plan: true, billingStatus: true, activeModules: true,
        maxUsers: true, maxEmployees: true, trialEndsAt: true, suspensionReason: true, createdAt: true, isActive: true,
        asaasCustomerId: true, asaasSubscriptionId: true, internalNotes: actor.role === 'CONTABIL' ? false : true,
        subscription: { select: { status: true, seatQuantity: true, nextDueDate: true, billingPaused: true, baseMonthlyPrice: true, userMonthlyPrice: true, discountPercent: true, trialEndsAt: true, plan: { select: { name: true, code: true } } } },
        _count: { select: { users: true, employees: true } },
      },
    });
    const [invoices, contracts, tickets, ticketCount, audit, closings, payroll, activeEmployees, roles] = await Promise.all([
      financeAllowed ? this.prisma.platformInvoice.findMany({ where: { companyId, deletedAt: null }, select: { id: true, amount: true, dueDate: true, status: true, invoiceNumber: true, paidAt: true, description: true, nfeStatus: true }, orderBy: { dueDate: 'desc' }, take: 12 }) : Promise.resolve([]),
      actor.role === 'CONTABIL' ? Promise.resolve([]) : this.prisma.manualContract.findMany({ where: { companyId }, select: { id: true, status: true, agreedAmount: true, startsAt: true, endsAt: true }, orderBy: { createdAt: 'desc' }, take: 3 }),
      actor.role === 'CONTABIL' || actor.role === 'COMERCIAL' ? Promise.resolve([]) : this.prisma.supportTicket.findMany({ where: { companyId }, select: { id: true, ticketNumber: true, title: true, status: true, priority: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
      actor.role === 'CONTABIL' || actor.role === 'COMERCIAL' ? Promise.resolve(0) : this.prisma.supportTicket.count({ where: { companyId, status: { in: ['NEW', 'TRIAGE', 'IN_PROGRESS', 'REOPENED'] } } }),
      this.prisma.auditLog.findMany({ where: { companyId }, select: { id: true, action: true, entity: true, createdAt: true, user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.timeClosing.groupBy({ by: ['status'], where: { companyId, periodStart: { gte: start, lt: end } }, _count: true, _sum: { grossPay: true, netPay: true } }),
      this.prisma.payroll.groupBy({ by: ['status'], where: { companyId, referenceYear: start.getUTCFullYear(), referenceMonth: start.getUTCMonth() + 1, deletedAt: null }, _count: true, _sum: { grossSalary: true, netSalary: true } }),
      this.prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.user.groupBy({ by: ['role'], where: { companyId, isActive: true }, _count: true }),
    ]);

    const overdue = invoices.filter((item) => item.status === 'OVERDUE');
    return {
      scope: 'COMPANY',
      company: {
        ...company,
        asaasCustomerId: mask(company.asaasCustomerId),
        asaasSubscriptionId: mask(company.asaasSubscriptionId),
        subscription: company.subscription ? { ...company.subscription, baseMonthlyPrice: num(company.subscription.baseMonthlyPrice), userMonthlyPrice: num(company.subscription.userMonthlyPrice), discountPercent: num(company.subscription.discountPercent) } : null,
      },
      usage: { users: company._count.users, maxUsers: company.maxUsers, employees: company._count.employees, activeEmployees, maxEmployees: company.maxEmployees, roles: Object.fromEntries(roles.map((row) => [row.role, row._count])) },
      finance: financeAllowed ? { invoices: invoices.map((item) => ({ ...item, amount: num(item.amount) })), overdueTotal: overdue.reduce((sum, item) => sum + num(item.amount), 0), overdueCount: overdue.length } : null,
      contracts: contracts.map((item) => ({ ...item, agreedAmount: num(item.agreedAmount) })),
      support: { open: ticketCount, recent: tickets },
      accounting: {
        month: start.toISOString().slice(0, 7),
        closings: closings.map((row) => ({ status: row.status, count: row._count, gross: num(row._sum.grossPay), net: num(row._sum.netPay) })),
        payroll: payroll.map((row) => ({ status: row.status, count: row._count, gross: num(row._sum.grossSalary), net: num(row._sum.netSalary) })),
      },
      recentActivity: audit.map((item) => ({ id: item.id, action: item.action, entity: item.entity, at: item.createdAt, user: item.user?.name ?? null })),
    };
  }
}
