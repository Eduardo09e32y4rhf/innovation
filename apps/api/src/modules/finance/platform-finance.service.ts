import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AsaasPayment, AsaasService } from './asaas.service';
import { PricingService } from './pricing.service';
import { CreatePlatformInvoiceDto, ListPlatformInvoicesDto, UpdatePlatformInvoiceDto } from './dto/platform-finance.dto';

@Injectable()
export class PlatformFinanceService {
  private readonly logger = new Logger(PlatformFinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
    private readonly pricingService: PricingService,
  ) {}

  async ensureAsaasCustomer(company: any, admin: any) {
    let customerId = company.subscription?.asaasCustomerId || company.asaasCustomerId;
    if (!customerId) {
      const customer = await this.asaas.createCustomer({
        name: company.legalName || company.name,
        cpfCnpj: company.document,
        email: admin.email,
        mobilePhone: company.phone || undefined,
        externalReference: company.id,
        notificationDisabled: true,
      });
      if (!customer.id) throw new BadRequestException('O Asaas nao retornou o identificador do cliente.');
      customerId = customer.id;
      await this.prisma.$transaction([
        this.prisma.company.update({ where: { id: company.id }, data: { asaasCustomerId: customerId } }),
        this.prisma.companySubscription.updateMany({ where: { companyId: company.id }, data: { asaasCustomerId: customerId } }),
      ]);
    }
    return customerId;
  }

  async createInitialCharge(company: any, customerId: string, amount: number) {
    const dueDate = new Date();
    // Vencimento hoje ou amanhã
    dueDate.setUTCDate(dueDate.getUTCDate() + 1);
    
    const payment = await this.asaas.createCharge(customerId, {
      value: amount,
      dueDate: dueDate.toISOString().slice(0, 10),
      description: 'Mensalidade Innovation RH - avulsa',
      billingType: 'UNDEFINED',
      externalReference: `signup:${company.id}`,
    });
    
    if (!payment.id || !payment.invoiceUrl) {
      throw new BadRequestException('O Asaas nao retornou o link da cobranca.');
    }

    const invoice = await this.prisma.platformInvoice.upsert({
      where: { asaasPaymentId: payment.id },
      create: {
        companyId: company.id,
        planId: company.platformPlanId,
        description: payment.description || 'Mensalidade Innovation RH - avulsa',
        amount,
        dueDate: new Date(payment.dueDate),
        status: (this.mapAsaasStatus(payment.status || 'PENDING') || 'OPEN') as InvoiceStatus,
        billingType: payment.billingType || 'UNDEFINED',
        asaasPaymentId: payment.id,
        invoiceUrl: payment.invoiceUrl,
      },
      update: { invoiceUrl: payment.invoiceUrl, status: (this.mapAsaasStatus(payment.status || 'PENDING') || 'OPEN') as InvoiceStatus, deletedAt: null },
    });

    return { paymentUrl: payment.invoiceUrl, invoice };
  }

  async createRecurringSubscription(company: any, customerId: string, amount: number) {
    const existingSubscriptionId = company.subscription?.asaasSubscriptionId || company.asaasSubscriptionId;
    if (existingSubscriptionId) return existingSubscriptionId;
    
    const cycle = company.platformPlan?.cycle || 'MONTHLY';
    const nextDueDate = new Date();
    
    // Assinatura comeca no proximo ciclo
    if (cycle === 'YEARLY') nextDueDate.setUTCFullYear(nextDueDate.getUTCFullYear() + 1);
    else if (cycle === 'QUARTERLY') nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 3);
    else nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 1);

    const sub = await this.asaas.createSubscription(customerId, {
      value: amount,
      nextDueDate: nextDueDate.toISOString().slice(0, 10),
      cycle: ['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(cycle) ? cycle : 'MONTHLY',
      description: `${company.platformPlan?.name || 'Plano Innovation'} - mensalidade`,
    });
    
    if (sub.id) {
      await this.prisma.$transaction([
        this.prisma.company.update({ where: { id: company.id }, data: { asaasSubscriptionId: sub.id } }),
        this.prisma.companySubscription.updateMany({ where: { companyId: company.id }, data: { asaasSubscriptionId: sub.id } }),
      ]);
      return sub.id;
    }
    return null;
  }

  async ensureCompanyOnboardingBilling(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        platformPlan: true,
        subscription: true,
        users: { where: { role: 'ADMIN', isActive: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      },
    });
    if (!company) throw new NotFoundException('Empresa nao encontrada.');

    if (company.platformPlan?.isFree || company.billingStatus === 'TRIAL') {
      if (company.platformPlan?.isFree) {
        await this.prisma.company.update({
          where: { id: company.id },
          data: { status: 'ACTIVE', isActive: true, billingStatus: 'ACTIVE', suspensionReason: null },
        });
      }
      return { active: true, paymentUrl: null, invoice: null };
    }

    const plan = company.platformPlan;
    let amount = plan ? Number(plan.price) : Number(process.env.DEFAULT_SIGNUP_PRICE || 49.9);
    if (plan && !plan.isFree) {
      const pricing = this.pricingService.calculate(
        (plan.commitmentMonths as any) || 1, 
        company.subscription?.seatQuantity || 1
      );
      amount = pricing.total;
    }

    if (amount <= 0) return { active: true, paymentUrl: null, invoice: null };
    if (!this.asaas.isConfigured()) {
      throw new BadRequestException('A integracao Asaas nao esta configurada.');
    }
    if (!company.document) throw new BadRequestException('CPF ou CNPJ da empresa e obrigatorio para cobrar.');
    const admin = company.users[0];
    if (!admin) throw new BadRequestException('A empresa nao possui administrador ativo.');

    const customerId = await this.ensureAsaasCustomer(company, admin);

    const existing = await this.prisma.platformInvoice.findFirst({
      where: { companyId, deletedAt: null, status: { in: ['OPEN', 'OVERDUE'] }, invoiceUrl: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    
    let paymentUrl = existing?.invoiceUrl;
    let invoice = existing;

    if (!existing) {
      const initialCharge = await this.createInitialCharge(company, customerId, amount);
      paymentUrl = initialCharge.paymentUrl;
      invoice = initialCharge.invoice as any;
    }

    // Garante que a assinatura foi criada em paralelo (para cobrar depois da avulsa)
    await this.createRecurringSubscription(company, customerId, amount).catch(() => {});

    // Usa PENDING_PAYMENT como status pendente aqui, separando clientes novos de devedores antigos
    if (invoice?.status !== 'PAID') {
      await this.prisma.company.update({
        where: { id: company.id },
        data: { status: 'SUSPENDED', isActive: false, billingStatus: 'PENDING_PAYMENT', suspensionReason: 'aguardando_primeiro_pagamento' },
      });
    }

    return { active: invoice?.status === 'PAID', paymentUrl, invoice };
  }

  async getCompanyBilling(companyId: string) {
    let company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        status: true,
        billingStatus: true,
        asaasCustomerId: true,
        asaasSubscriptionId: true,
        subscription: true,
        platformPlan: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            cycle: true,
            maxUsers: true,
            maxEmployees: true,
            activeModules: true,
          },
        },
        _count: {
          select: {
            users: true,
            employees: true,
          },
        },
      },
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
            this.prisma.platformInvoice.update({ where: { id: invoice.id }, data: { status: 'PAID', paidAt: invoice.paidAt ?? new Date(), invoiceUrl: payment.invoiceUrl ?? invoice.invoiceUrl } }),
            this.prisma.company.update({ where: { id: companyId }, data: { status: 'ACTIVE', isActive: true, billingStatus: 'ACTIVE', suspensionReason: null } }),
          ]);
          invoice = updatedInvoice;
          // Não precisamos recarregar todos os includes da company aqui para o polling fallback
          company.status = updatedCompany.status;
          company.billingStatus = updatedCompany.billingStatus;
        } else if (remoteStatus && remoteStatus !== invoice.status) {
          invoice = await this.prisma.platformInvoice.update({ where: { id: invoice.id }, data: { status: remoteStatus } });
        }
      } catch (error) {
        this.logger.warn(`Falha no polling da cobranca ${invoice.asaasPaymentId}: ${String(error)}`);
      }
    }

    let subscriptionData = null;
    if (company.asaasSubscriptionId && this.asaas.isConfigured()) {
      try {
        const asaasSub = await this.asaas.getSubscription(company.asaasSubscriptionId);
        subscriptionData = {
          id: asaasSub.id,
          status: asaasSub.status,
          nextDueDate: asaasSub.nextDueDate,
          billingType: asaasSub.billingType,
        };
      } catch (err) {
        this.logger.warn(`Falha ao buscar assinatura no Asaas: ${String(err)}`);
      }
    }

    let currentInvoiceData = null;
    if (invoice) {
      currentInvoiceData = {
        id: invoice.id,
        status: invoice.status,
        amount: Number(invoice.amount),
        dueDate: invoice.dueDate,
        invoiceUrl: invoice.invoiceUrl,
        bankSlipUrl: invoice.invoiceUrl, // No sandbox/asaas bankSlipUrl geralmente está na mesma invoiceUrl do checkout
        pixAvailable: invoice.billingType === 'PIX' || invoice.billingType === 'UNDEFINED',
      };
    }

    return {
      active: company.status === 'ACTIVE' && ['ACTIVE', 'TRIAL'].includes(company.billingStatus),
      paymentUrl: currentInvoiceData?.invoiceUrl ?? null,
      invoice: currentInvoiceData,
      currentInvoice: currentInvoiceData,
      company: {
        id: company.id,
        status: company.status,
        billingStatus: company.billingStatus,
      },
      plan: company.platformPlan,
      subscription: company.subscription ? { ...company.subscription, asaas: subscriptionData } : null,
      usage: {
        users: company._count.users,
        maxUsers: company.subscription?.seatQuantity ?? 0,
        employees: company._count.employees,
        maxEmployees: company.platformPlan?.maxEmployees ?? 9999,
      },
    };
  }

  async listCompanyInvoices(companyId: string, commercialOwnerId?: string) {
    return this.prisma.platformInvoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(commercialOwnerId ? { company: { commercialOwnerId } } : {}),
      },
      orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  async changeCompanyPlan(companyId: string, newPlanId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa não encontrada.');

    const newPlan = await this.prisma.platformPlan.findUnique({
      where: { id: newPlanId },
    });
    if (!newPlan) throw new NotFoundException('Plano não encontrado.');
    if (!newPlan.isActive) throw new BadRequestException('Este plano não está mais disponível.');

    // Remove old subscription if exists
    if (company.asaasSubscriptionId && this.asaas.isConfigured()) {
      try {
        await this.asaas.deleteSubscription(company.asaasSubscriptionId);
      } catch (err) {
        this.logger.warn(`Falha ao remover assinatura anterior: ${String(err)}`);
      }
    }

    // Cancel OPEN invoices
    const openInvoices = await this.prisma.platformInvoice.findMany({
      where: { companyId, status: { in: ['OPEN', 'OVERDUE'] }, deletedAt: null },
    });
    for (const inv of openInvoices) {
      if (inv.asaasPaymentId && this.asaas.isConfigured()) {
        try {
          await this.asaas.deleteCharge(inv.asaasPaymentId);
        } catch (err) {
          // ignore
        }
      }
      await this.prisma.platformInvoice.update({
        where: { id: inv.id },
        data: { status: 'CANCELED', invoiceCanceledAt: new Date(), invoiceStatus: 'CANCELED' },
      });
    }

    let customerId = company.asaasCustomerId;
    if (!customerId && this.asaas.isConfigured()) {
      const cust = await this.asaas.createCustomer({
        name: company.name,
        email: company.email ?? `financeiro+${company.id}@example.com`,
        cpfCnpj: (company.document as string) ?? undefined,
      });
      customerId = cust.id;
    }

    let subscriptionId = null;
    if (this.asaas.isConfigured() && customerId) {
      const cycleMonths = newPlan.cycle === 'YEARLY' ? 12 : newPlan.cycle === 'QUARTERLY' ? 3 : 1;
      const nextDueDate = new Date();
      nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + cycleMonths);

      try {
        const subscription = await this.asaas.createSubscription(customerId, {
          value: Number(newPlan.price),
          nextDueDate: nextDueDate.toISOString().slice(0, 10),
          description: `Renovacao - Plano ${newPlan.name}`,
          cycle: ['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(newPlan.cycle) ? newPlan.cycle as any : 'MONTHLY',
        });
        subscriptionId = subscription.id;
      } catch (err) {
        this.logger.error(`Falha ao criar nova assinatura: ${String(err)}`);
      }
    }

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        platformPlanId: newPlan.id,
        asaasCustomerId: customerId,
        asaasSubscriptionId: subscriptionId,
      },
    });

    // Create a new invoice immediately
    await this.ensureCompanyOnboardingBilling(companyId);

    return { message: 'Plano alterado com sucesso' };
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

  async summary(query: Pick<ListPlatformInvoicesDto, 'from' | 'to'>, commercialOwnerId?: string) {
    const where = this.buildWhere(query, commercialOwnerId);
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

  async list(query: ListPlatformInvoicesDto, commercialOwnerId?: string) {
    const where = this.buildWhere(query, commercialOwnerId);
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
      select: { id: true, name: true, asaasCustomerId: true },
    });
    if (!company) throw new NotFoundException('Empresa nao encontrada.');

    let payment: AsaasPayment | undefined;
    if (dto.sendToAsaas) {
      if (!this.asaas.isConfigured()) {
        throw new BadRequestException('A integracao Asaas nao esta configurada. Crie a fatura como local.');
      }
      if (!company.asaasCustomerId) {
        throw new BadRequestException('A empresa ainda nao possui Customer ID no Asaas.');
      }
      payment = await this.asaas.createCharge(company.asaasCustomerId, {
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
        invoiceUrl: payment?.invoiceUrl,
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
        invoiceUrl: payment.invoiceUrl ?? invoice.invoiceUrl,
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

  async requestRefund(id: string, companyId?: string) {
    const invoice = await this.prisma.platformInvoice.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!invoice) throw new NotFoundException('Fatura nao encontrada.');
    if (invoice.status !== 'PAID') throw new BadRequestException('A fatura precisa estar paga para ser estornada.');
    if (!invoice.asaasPaymentId) throw new BadRequestException('Fatura local nao pode ser estornada no Asaas.');

    const paidAt = invoice.paidAt || new Date();
    const daysSincePayment = (new Date().getTime() - paidAt.getTime()) / (1000 * 3600 * 24);
    if (daysSincePayment > 7) {
      throw new BadRequestException('O prazo de 7 dias para estorno automatico ja expirou.');
    }

    try {
      await this.asaas.refundPayment(invoice.asaasPaymentId);
    } catch (error) {
      this.logger.error(`Falha ao solicitar estorno da fatura ${id}: ${String(error)}`);
      throw new BadRequestException('O Asaas recusou o pedido de estorno. Verifique se o saldo esta disponivel.');
    }

    const updated = await this.prisma.platformInvoice.update({
      where: { id },
      data: { status: 'CANCELED' },
      include: { company: { select: { id: true, name: true } }, plan: { select: { id: true, name: true } } },
    });

    await this.prisma.company.update({
      where: { id: invoice.companyId },
      data: { status: 'SUSPENDED', isActive: false, billingStatus: 'PAST_DUE', suspensionReason: 'pagamento_cancelado_ou_estornado' },
    });

    return updated;
  }

  private async findActive(id: string) {
    const invoice = await this.prisma.platformInvoice.findFirst({ where: { id, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Fatura nao encontrada.');
    return invoice;
  }

  private buildWhere(
    query: Pick<ListPlatformInvoicesDto, 'status' | 'search' | 'from' | 'to'>,
    commercialOwnerId?: string,
  ): Prisma.PlatformInvoiceWhereInput {
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
      company: commercialOwnerId || query.search
        ? {
            ...(commercialOwnerId ? { commercialOwnerId } : {}),
            ...(query.search
              ? {
                  OR: [
                    { name: { contains: query.search, mode: 'insensitive' } },
                    { legalName: { contains: query.search, mode: 'insensitive' } },
                    { document: { contains: query.search } },
                  ],
                }
              : {}),
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

  private isPaid(status?: string) {
    return !!status && ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status);
  }
}