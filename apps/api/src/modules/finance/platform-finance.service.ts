import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AsaasPayment, AsaasService } from './asaas.service';
import { CreatePlatformInvoiceDto, ListPlatformInvoicesDto, UpdatePlatformInvoiceDto } from './dto/platform-finance.dto';

@Injectable()
export class PlatformFinanceService {
  private readonly logger = new Logger(PlatformFinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
  ) {}

  async ensureCompanyCheckout(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        platformPlan: true,
        users: { where: { role: 'ADMIN', isActive: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      },
    });
    if (!company) throw new NotFoundException('Empresa nao encontrada.');

    const isFreePlan = Boolean(company.platformPlan?.isFree);
    const amount = company.platformPlan ? this.moneyToNumber(company.platformPlan.price) : this.moneyToNumber(process.env.DEFAULT_SIGNUP_PRICE, 49.9);
    if (!isFreePlan && (!Number.isFinite(amount) || amount <= 0)) {
      throw new BadRequestException('Plano pago sem valor valido. Corrija o preco do plano antes de gerar checkout.');
    }
    if (!this.asaas.isConfigured()) {
      throw new BadRequestException('A integracao Asaas nao esta configurada.');
    }
    if (!company.document) throw new BadRequestException('CPF ou CNPJ da empresa e obrigatorio para cobrar.');
    const admin = company.users[0];
    if (!admin) throw new BadRequestException('A empresa nao possui administrador ativo.');

    const customerId = await this.ensureCustomerId(company, admin.email);
    if (isFreePlan) {
      await this.prisma.company.update({
        where: { id: company.id },
        data: { status: 'ACTIVE', isActive: true, billingStatus: 'ACTIVE', suspensionReason: null },
      });
      return { active: true, paymentUrl: null, invoice: null };
    }

    const existing = await this.prisma.platformInvoice.findFirst({
      where: { companyId, deletedAt: null, status: { in: ['OPEN', 'OVERDUE'] }, invoiceUrl: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    const description = `${company.platformPlan?.name || 'Plano Innovation'} - primeira mensalidade`;
    if (existing) {
      let invoice = existing;
      if (this.moneyToNumber(existing.amount) <= 0 || existing.planId !== company.platformPlanId) {
        if (existing.asaasPaymentId && this.moneyToNumber(existing.amount) <= 0) {
          try {
            await this.asaas.updateCharge(existing.asaasPaymentId, { value: amount, description });
          } catch (error) {
            this.logger.warn(`Falha ao atualizar valor da cobranca Asaas ${existing.asaasPaymentId}: ${String(error)}`);
          }
        }
        invoice = await this.prisma.platformInvoice.update({
          where: { id: existing.id },
          data: { amount, planId: company.platformPlanId, description },
        });
      }
      await this.ensureSubscription(company.id, customerId, amount, description, company.platformPlan?.cycle || 'MONTHLY', company.asaasSubscriptionId);
      return { active: false, paymentUrl: invoice.invoiceUrl, invoice };
    }

    const dueDate = new Date();
    dueDate.setUTCDate(dueDate.getUTCDate() + 1);
    const payment = await this.asaas.createCharge(customerId, {
      value: amount,
      dueDate: dueDate.toISOString().slice(0, 10),
      description,
      billingType: 'UNDEFINED',
      externalReference: company.id,
    });
    const paymentUrl = this.paymentUrl(payment);
    if (!payment.id || !paymentUrl) {
      throw new BadRequestException('O Asaas nao retornou o link da cobranca.');
    }

    const invoice = await this.prisma.platformInvoice.upsert({
      where: { asaasPaymentId: payment.id },
      create: {
        companyId: company.id,
        planId: company.platformPlanId,
        description,
        amount,
        dueDate,
        status: 'OPEN',
        billingType: payment.billingType || 'UNDEFINED',
        asaasPaymentId: payment.id,
        invoiceUrl: paymentUrl,
      },
      update: { invoiceUrl: paymentUrl, status: 'OPEN', deletedAt: null },
    });

    await this.prisma.company.update({
      where: { id: company.id },
      data: { status: 'SUSPENDED', isActive: false, billingStatus: 'PAST_DUE', suspensionReason: 'aguardando_pagamento' },
    });
    await this.ensureSubscription(company.id, customerId, amount, description, company.platformPlan?.cycle || 'MONTHLY', company.asaasSubscriptionId);
    return { active: false, paymentUrl: invoice.invoiceUrl, invoice };
  }

  async getCompanyBilling(companyId: string) {
    let company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, status: true, billingStatus: true, suspensionReason: true, asaasCustomerId: true, asaasSubscriptionId: true },
    });
    if (!company) throw new NotFoundException('Empresa nao encontrada.');
    let invoice = await this.prisma.platformInvoice.findFirst({
      where: { companyId, deletedAt: null, status: { in: ['OPEN', 'OVERDUE'] } },
      orderBy: { createdAt: 'desc' },
    });

    // Polling fallback keeps onboarding recoverable if a webhook delivery is delayed.
    if (invoice?.asaasPaymentId && this.asaas.isConfigured() && company.status !== 'ACTIVE') {
      try {
        const payment = await this.asaas.getCharge(invoice.asaasPaymentId);
        const remoteStatus = this.mapAsaasStatus(payment.status);
        if (remoteStatus === 'PAID') {
          const [updatedInvoice, updatedCompany] = await this.prisma.$transaction([
            this.prisma.platformInvoice.update({ where: { id: invoice.id }, data: { status: 'PAID', paidAt: invoice.paidAt ?? new Date(), invoiceUrl: this.paymentUrl(payment) ?? invoice.invoiceUrl } }),
            this.prisma.company.update({ where: { id: companyId }, data: { status: 'ACTIVE', isActive: true, billingStatus: 'ACTIVE', suspensionReason: null } }),
          ]);
          invoice = updatedInvoice;
          company = updatedCompany;
        } else if (remoteStatus && remoteStatus !== invoice.status) {
          invoice = await this.prisma.platformInvoice.update({ where: { id: invoice.id }, data: { status: remoteStatus } });
        }
      } catch (error) {
        this.logger.warn(`Falha no polling da cobranca ${invoice.asaasPaymentId}: ${String(error)}`);
      }
    }
    return { company, invoice, active: company.status === 'ACTIVE' && company.billingStatus === 'ACTIVE' };
  }

  async listCompanyInvoices(companyId: string) {
    return this.prisma.platformInvoice.findMany({
      where: { companyId, deletedAt: null },
      orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  private async ensureCustomerId(
    company: { id: string; name: string; legalName?: string | null; document?: string | null; phone?: string | null; asaasCustomerId?: string | null },
    adminEmail?: string | null,
  ) {
    if (company.asaasCustomerId) return company.asaasCustomerId;
    if (!company.document) throw new BadRequestException('CPF ou CNPJ da empresa e obrigatorio para cobrar no Asaas.');
    if (!adminEmail) throw new BadRequestException('A empresa nao possui administrador ativo.');

    const customer = await this.asaas.createCustomer({
      name: company.legalName || company.name,
      cpfCnpj: company.document,
      email: adminEmail,
      phone: company.phone || undefined,
    });
    if (!customer.id) throw new BadRequestException('O Asaas nao retornou o identificador do cliente.');
    await this.prisma.company.update({ where: { id: company.id }, data: { asaasCustomerId: customer.id } });
    return customer.id;
  }
  private async ensureSubscription(
    companyId: string,
    customerId: string,
    amount: number,
    description: string,
    cycle: string,
    currentSubscriptionId?: string | null,
  ) {
    if (currentSubscriptionId) return currentSubscriptionId;
    const cycleMonths = cycle === 'YEARLY' ? 12 : cycle === 'QUARTERLY' ? 3 : 1;
    const nextDueDate = new Date();
    nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + cycleMonths);
    try {
      const subscription = await this.asaas.createSubscription(customerId, {
        value: amount,
        nextDueDate: nextDueDate.toISOString().slice(0, 10),
        description: description.replace('primeira mensalidade', 'renovacao'),
        cycle: ['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(cycle) ? cycle : 'MONTHLY',
      });
      if (subscription.id) {
        await this.prisma.company.update({ where: { id: companyId }, data: { asaasSubscriptionId: subscription.id } });
      }
      return subscription.id;
    } catch (error) {
      this.logger.error(`Falha ao criar assinatura Asaas para ${companyId}: ${String(error)}`);
      return undefined;
    }
  }

  async summary(query: Pick<ListPlatformInvoicesDto, 'from' | 'to'>) {
    const where = this.buildWhere(query);
    const invoices = await this.prisma.platformInvoice.findMany({
      where,
      select: { amount: true, status: true, dueDate: true, paidAt: true },
    });

    const totals = { billed: 0, received: 0, open: 0, overdue: 0, canceled: 0 };
    const monthly = new Map<string, { month: string; billed: number; received: number }>();

    for (const invoice of invoices) {
      const amount = Number(invoice.amount);
      const month = invoice.dueDate.toISOString().slice(0, 7);
      const bucket = monthly.get(month) ?? { month, billed: 0, received: 0 };
      if (invoice.status !== 'CANCELED') {
        totals.billed += amount;
        bucket.billed += amount;
      }
      if (invoice.status === 'PAID') {
        totals.received += amount;
        bucket.received += amount;
      }
      if (invoice.status === 'OPEN') totals.open += amount;
      if (invoice.status === 'OVERDUE') totals.overdue += amount;
      if (invoice.status === 'CANCELED') totals.canceled += amount;
      monthly.set(month, bucket);
    }

    return {
      totals,
      count: invoices.length,
      conversionRate: totals.billed > 0 ? Number(((totals.received / totals.billed) * 100).toFixed(1)) : 0,
      monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
    };
  }

  async list(query: ListPlatformInvoicesDto) {
    const where = this.buildWhere(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.platformInvoice.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, legalName: true, document: true, asaasCustomerId: true } },
          plan: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.platformInvoice.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async create(dto: CreatePlatformInvoiceDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
      select: {
        id: true,
        name: true,
        legalName: true,
        document: true,
        phone: true,
        asaasCustomerId: true,
        users: { where: { role: 'ADMIN', isActive: true }, orderBy: { createdAt: 'asc' }, take: 1, select: { email: true } },
      },
    });
    if (!company) throw new NotFoundException('Empresa nao encontrada.');

    let payment: AsaasPayment | undefined;
    if (dto.sendToAsaas) {
    if (!this.asaas.isConfigured()) {
        throw new BadRequestException('A integracao Asaas nao esta configurada. Crie a fatura como local.');
      }
      const admin = company.users[0];
      if (!admin) throw new BadRequestException('A empresa nao possui administrador ativo.');
      const customerId = await this.ensureCustomerId(company, admin.email);
      payment = await this.asaas.createCharge(customerId, {
        value: dto.amount,
        dueDate: dto.dueDate.slice(0, 10),
        description: dto.description,
        billingType: dto.billingType,
        externalReference: dto.companyId,
      });
    }

    return this.prisma.platformInvoice.create({
      data: {
        companyId: dto.companyId,
        planId: dto.planId,
        description: dto.description,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        billingType: dto.billingType,
        status: this.mapAsaasStatus(payment?.status) ?? 'OPEN',
        asaasPaymentId: payment?.id,
        invoiceUrl: payment ? this.paymentUrl(payment) : undefined,
        paidAt: this.isPaid(payment?.status) ? new Date() : null,
      },
      include: { company: { select: { id: true, name: true } }, plan: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdatePlatformInvoiceDto) {
    const invoice = await this.findActive(id);
    if (invoice.status === 'PAID' && (dto.amount !== undefined || dto.dueDate !== undefined)) {
      throw new BadRequestException('Faturas pagas nao podem ter valor ou vencimento alterados.');
    }

    if (invoice.asaasPaymentId && invoice.status !== 'CANCELED') {
      const remoteUpdate: Record<string, unknown> = {};
      if (dto.description !== undefined) remoteUpdate.description = dto.description;
      if (dto.amount !== undefined) remoteUpdate.value = dto.amount;
      if (dto.dueDate !== undefined) remoteUpdate.dueDate = dto.dueDate.slice(0, 10);
      if (dto.billingType !== undefined) remoteUpdate.billingType = dto.billingType;
      if (Object.keys(remoteUpdate).length) {
        await this.asaas.updateCharge(invoice.asaasPaymentId, remoteUpdate);
      }
    }

    return this.prisma.platformInvoice.update({
      where: { id },
      data: {
        description: dto.description,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        billingType: dto.billingType,
        status: dto.status,
        paidAt: dto.status === 'PAID' ? invoice.paidAt ?? new Date() : dto.status ? null : undefined,
      },
      include: { company: { select: { id: true, name: true } }, plan: { select: { id: true, name: true } } },
    });
  }

  async sync(id: string) {
    const invoice = await this.findActive(id);
    if (!invoice.asaasPaymentId) throw new BadRequestException('Esta fatura e somente local.');
    const payment = await this.asaas.getCharge(invoice.asaasPaymentId);
    const status = this.mapAsaasStatus(payment.status) ?? invoice.status;
    return this.prisma.platformInvoice.update({
      where: { id },
      data: {
        status,
        invoiceUrl: this.paymentUrl(payment) ?? invoice.invoiceUrl,
        paidAt: this.isPaid(payment.status) ? invoice.paidAt ?? new Date() : invoice.paidAt,
      },
      include: { company: { select: { id: true, name: true } }, plan: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    const invoice = await this.findActive(id);
    if (invoice.asaasPaymentId && invoice.status !== 'PAID' && invoice.status !== 'CANCELED') {
      await this.asaas.deleteCharge(invoice.asaasPaymentId);
    }
    await this.prisma.platformInvoice.update({
      where: { id },
      data: { status: 'CANCELED', deletedAt: new Date() },
    });
    this.logger.log(`Fatura ${id} cancelada e removida da listagem.`);
    return { id };
  }

  private async findActive(id: string) {
    const invoice = await this.prisma.platformInvoice.findFirst({ where: { id, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Fatura nao encontrada.');
    return invoice;
  }

  private buildWhere(query: Pick<ListPlatformInvoicesDto, 'status' | 'search' | 'from' | 'to'>): Prisma.PlatformInvoiceWhereInput {
    const dueDate = query.from || query.to
      ? {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(`${query.to.slice(0, 10)}T23:59:59.999Z`) : undefined,
        }
      : undefined;
    return {
      deletedAt: null,
      status: query.status as InvoiceStatus | undefined,
      dueDate,
      company: query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { legalName: { contains: query.search, mode: 'insensitive' } },
              { document: { contains: query.search } },
            ],
          }
        : undefined,
    };
  }

  private mapAsaasStatus(status?: string): InvoiceStatus | undefined {
    if (!status) return undefined;
    if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status)) return 'PAID';
    if (status === 'OVERDUE') return 'OVERDUE';
    if (['REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE'].includes(status)) return 'CANCELED';
    return 'OPEN';
  }

  private paymentUrl(payment?: AsaasPayment | null): string | null {
    return payment?.invoiceUrl || payment?.bankSlipUrl || payment?.paymentLink || payment?.checkoutUrl || null;
  }
  private moneyToNumber(value: unknown, fallback = 0): number {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    const raw = String(value).trim();
    if (!raw) return fallback;
    const normalized = raw.includes(',')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '');
    const amount = Number(normalized);
    return Number.isFinite(amount) ? Number(amount.toFixed(2)) : fallback;
  }

  private isPaid(status?: string) {
    return !!status && ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status);
  }
}