import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, $Enums } from '@prisma/client';
type InvoiceStatus = $Enums.InvoiceStatus;
const InvoiceStatus = $Enums.InvoiceStatus;
import type { JwtUser } from '../../common/types/auth.types';
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

  private audit(companyId: string, action: string, metadata: Record<string, unknown>, actor?: JwtUser, entity = 'Billing', entityId?: string) {
    return this.prisma.auditLog.create({
      data: {
        companyId,
        action,
        entity,
        entityId: entityId ?? null,
        userId: actor?.sub ?? null,
        metadata: {
          ...metadata,
          actorEmail: actor?.email ?? 'system',
        },
      },
    });
  }

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
      if (!customer.id) throw new BadRequestException('O Asaas não retornou o identificador do cliente.');
      customerId = customer.id;
      await this.prisma.$transaction([
        this.prisma.company.update({ where: { id: company.id }, data: { asaasCustomerId: customerId } }),
        this.prisma.companySubscription.updateMany({ where: { companyId: company.id }, data: { asaasCustomerId: customerId } }),
      ]);
      await this.audit(company.id, 'ASAAS_CUSTOMER_CREATED', { customerId, adminEmail: admin.email }, undefined, 'Subscription', customerId);
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
      throw new BadRequestException('O Asaas não retornou o link da cobranca.');
    }

    const invoice = await this.prisma.platformInvoice.upsert({
      where: { asaasPaymentId: payment.id },
      create: {
        companyId: company.id,
        planId: company.platformPlanId,
        description: payment.description || 'Mensalidade Innovation RH - avulsa',
        amount,
        pricingSnapshot: {
          source: 'AUTOMATIC',
          pricingVersion: company.subscription?.pricingVersion ?? company.platformPlan?.pricingVersion ?? null,
          seatQuantity: company.subscription?.seatQuantity ?? null,
          baseMonthlyPrice: company.subscription?.baseMonthlyPrice ? Number(company.subscription.baseMonthlyPrice) : null,
          userMonthlyPrice: company.subscription?.userMonthlyPrice ? Number(company.subscription.userMonthlyPrice) : null,
          discountPercent: company.subscription?.discountPercent ? Number(company.subscription.discountPercent) : null,
          commitmentMonths: company.platformPlan?.commitmentMonths ?? null,
          total: amount,
        },
        dueDate: new Date(payment.dueDate),
        status: (this.mapAsaasStatus(payment.status || 'PENDING') || 'OPEN') as InvoiceStatus,
        billingType: payment.billingType || 'UNDEFINED',
        asaasPaymentId: payment.id,
        invoiceUrl: payment.invoiceUrl,
      },
      update: { invoiceUrl: payment.invoiceUrl, status: (this.mapAsaasStatus(payment.status || 'PENDING') || 'OPEN') as InvoiceStatus, deletedAt: null },
    });

    await this.audit(company.id, 'INITIAL_CHARGE_CREATED', {
      amount,
      customerId,
      paymentId: payment.id,
      dueDate: payment.dueDate,
      invoiceId: invoice.id,
    }, undefined, 'Billing', invoice.id);

    return { paymentUrl: payment.invoiceUrl, invoice };
  }

  async createRecurringSubscription(company: any, customerId: string, amount: number, requestedNextDueDate?: Date | null) {
    const existingSubscriptionId = company.subscription?.asaasSubscriptionId || company.asaasSubscriptionId;
    if (existingSubscriptionId) return existingSubscriptionId;
    
    const cycle = company.platformPlan?.cycle || 'MONTHLY';
    const nextDueDate = requestedNextDueDate ? new Date(requestedNextDueDate) : new Date();
    
    // Trials e contratos bonus informam a data exata; cadastros normais iniciam no proximo ciclo.
    if (!requestedNextDueDate) {
      if (cycle === 'YEARLY') nextDueDate.setUTCFullYear(nextDueDate.getUTCFullYear() + 1);
      else if (cycle === 'SEMIANNUALLY') nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 6);
      else if (cycle === 'QUARTERLY') nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 3);
      else nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 1);
    }

    const sub = await this.asaas.createSubscription(customerId, {
      value: amount,
      nextDueDate: nextDueDate.toISOString().slice(0, 10),
      cycle: ['MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY'].includes(cycle) ? cycle : 'MONTHLY',
      description: `${company.platformPlan?.name || 'Plano Innovation'} - mensalidade`,
    });
    
    if (sub.id) {
      await this.prisma.$transaction([
        this.prisma.company.update({ where: { id: company.id }, data: { asaasSubscriptionId: sub.id } }),
        this.prisma.companySubscription.updateMany({ where: { companyId: company.id }, data: { asaasSubscriptionId: sub.id, nextDueDate } }),
      ]);
      await this.audit(company.id, 'RECURRING_SUBSCRIPTION_CREATED', {
        amount,
        customerId,
        subscriptionId: sub.id,
        nextDueDate: nextDueDate.toISOString(),
        cycle,
      }, undefined, 'Subscription', sub.id);
      return sub.id;
    }
    return null;
  }

  async ensureCompanyOnboardingBilling(companyId: string, actor?: JwtUser) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        document: true,
        billingStatus: true,
        trialEndsAt: true,
        platformPlan: true,
        subscription: true,
        users: { where: { role: 'ADMIN', isActive: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      },
    });
    if (!company) throw new NotFoundException('Empresa nao encontrada.');

    if (company.platformPlan?.isFree) {
      await this.prisma.company.update({
        where: { id: company.id },
        data: { status: 'ACTIVE', isActive: true, billingStatus: 'ACTIVE', suspensionReason: null },
      });
      await this.audit(company.id, 'ONBOARDING_FREE_ACTIVATED', {
        planId: company.platformPlan?.id ?? null,
        planName: company.platformPlan?.name ?? null,
      }, actor, 'Company', company.id);
      return { active: true, paymentUrl: null, invoice: null };
    }

    if (company.billingStatus === 'TRIAL') {
      if (!this.asaas.isConfigured()) {
        await this.audit(company.id, 'ONBOARDING_TRIAL_READY', {
          trialEndsAt: company.trialEndsAt ?? null,
          reason: 'asaas_not_configured',
          planId: company.platformPlan?.id ?? null,
        }, actor, 'Company', company.id);
        return { active: true, paymentUrl: null, invoice: null, trialEndsAt: company.trialEndsAt };
      }
      if (!company.document) throw new BadRequestException('CPF ou CNPJ da empresa e obrigatorio para cobrar.');
      const admin = company.users[0];
      if (!admin) throw new BadRequestException('A empresa nao possui administrador ativo.');
      const customerId = await this.ensureAsaasCustomer(company, admin);
      const plan = company.platformPlan;
      const pricing = plan ? this.pricingService.calculate(
        (plan.commitmentMonths as any) || 1,
        company.subscription?.seatQuantity || 1,
        {
          baseMonthlyPrice: plan.baseMonthlyPrice,
          userMonthlyPrice: plan.userMonthlyPrice,
          price: plan.price,
        },
      ) : null;
      const amount = pricing?.total ?? Number(plan?.price ?? 0);
      const subscriptionId = amount > 0 ? await this.createRecurringSubscription(company, customerId, amount, company.trialEndsAt) : null;
      await this.audit(company.id, 'ONBOARDING_TRIAL_SUBSCRIPTION_SCHEDULED', {
        amount,
        trialEndsAt: company.trialEndsAt ?? null,
        planId: plan?.id ?? null,
        subscriptionId,
      }, actor, 'Subscription', subscriptionId ?? undefined);
      return { active: true, paymentUrl: null, invoice: null, trialEndsAt: company.trialEndsAt };
    }

    const plan = company.platformPlan;
    if (!plan) {
      throw new BadRequestException('A empresa nao possui plano e precificacao configurados.');
    }
    let amount = Number(plan.price);
    if (plan && !plan.isFree) {
      const pricing = this.pricingService.calculate(
        (plan.commitmentMonths as any) || 1,
        company.subscription?.seatQuantity || 1,
        {
          baseMonthlyPrice: plan.baseMonthlyPrice,
          userMonthlyPrice: plan.userMonthlyPrice,
          price: plan.price,
        },
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
    try {
      await this.createRecurringSubscription(company, customerId, amount);
    } catch (err) {
      this.logger.error(`Falha ao criar assinatura recorrente no Asaas: ${String(err)}`);
    }

    // Usa PENDING_PAYMENT como status pendente aqui, separando clientes novos de devedores antigos
    if (invoice?.status !== 'PAID') {
      await this.prisma.company.update({
        where: { id: company.id },
        data: { status: 'SUSPENDED', isActive: false, billingStatus: 'PENDING_PAYMENT', suspensionReason: 'aguardando_primeiro_pagamento' },
      });
    }

    await this.audit(company.id, 'ONBOARDING_PAYMENT_READY', {
      amount,
      paymentUrlCreated: Boolean(paymentUrl),
      invoiceId: invoice?.id ?? null,
      invoiceStatus: invoice?.status ?? null,
      planId: plan?.id ?? null,
    }, actor, 'Billing', invoice?.id ?? undefined);

    return { active: invoice?.status === 'PAID', paymentUrl, invoice };
  }

  async ensureManualContractBilling(companyId: string, nextDueDate: Date) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        platformPlan: true,
        subscription: true,
        users: { where: { role: 'ADMIN', isActive: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      },
    });
    if (!company) return { configured: false, created: false };
    const plan = company.platformPlan;
    if (!plan) {
      return {
        configured: false,
        created: false,
        reason: 'MISSING_PLAN_PRICING',
      };
    }
    const quote = plan.isFree
      ? null
      : this.pricingService.calculate(
          (plan.commitmentMonths as any) || 1,
          company.subscription?.seatQuantity || 1,
          {
            baseMonthlyPrice: plan.baseMonthlyPrice,
            userMonthlyPrice: plan.userMonthlyPrice,
            price: plan.price,
          },
        );
    const amount = quote?.total ?? Number(plan.price);
    if (amount <= 0) return { configured: true, created: false };

    if (!this.asaas.isConfigured() || !company.document || !company.users[0]) {
      await this.prisma.platformInvoice.create({
        data: {
          companyId,
          planId: plan?.id,
          description: `Mensalidade Contrato Digital - ${company.name}`,
          amount,
          dueDate: nextDueDate,
          billingType: 'PIX',
          status: 'OPEN',
        },
      });
      return { configured: false, created: true, local: true };
    }

    const customerId = await this.ensureAsaasCustomer(company, company.users[0]);
    const subscriptionId = await this.createRecurringSubscription(company, customerId, amount, nextDueDate);
    if (subscriptionId) {
      await this.audit(company.id, 'MANUAL_CONTRACT_BILLING_SYNCED', {
        amount,
        nextDueDate: nextDueDate.toISOString(),
        subscriptionId,
        localFallback: false,
      }, undefined, 'Subscription', subscriptionId);
    }
    return { configured: true, created: Boolean(subscriptionId), subscriptionId };
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

    const billableUserCount = await this.prisma.user.count({
      where: { companyId, isActive: true, role: { in: ['RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] } },
    });

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
        users: billableUserCount,
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

  async changeSeatQuantity(companyId: string, nextSeatQuantity: number, actor?: JwtUser) {
    const subscription = await this.prisma.companySubscription.findUnique({
      where: { companyId },
      include: {
        plan: true,
        company: { select: { asaasSubscriptionId: true } },
      },
    });
    if (!subscription?.plan) throw new NotFoundException('Assinatura ativa não encontrada.');

    const usedSeats = await this.prisma.user.count({
      where: {
        companyId,
        isActive: true,
        role: { in: ['RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] },
      },
    });
    if (nextSeatQuantity < usedSeats) {
      throw new BadRequestException(`A empresa possui ${usedSeats} usuário(s) ativo(s). Desative usuários antes de reduzir as licenças.`);
    }

    if (nextSeatQuantity === subscription.seatQuantity && !subscription.pendingSeatQuantity) {
      return { changed: false, seatQuantity: subscription.seatQuantity, pendingSeatQuantity: null };
    }

    const commitmentMonths = subscription.plan.commitmentMonths as 1 | 3 | 6 | 12;
    const quote = this.pricingService.calculate(commitmentMonths, nextSeatQuantity);

    if (nextSeatQuantity < subscription.seatQuantity) {
      const updated = await this.prisma.companySubscription.update({
        where: { companyId },
        data: { pendingSeatQuantity: nextSeatQuantity },
      });
      await this.audit(companyId, 'SEATS_REDUCTION_SCHEDULED', {
        currentSeatQuantity: subscription.seatQuantity,
        nextSeatQuantity,
        usedSeats,
        effectiveAt: updated.currentPeriodEnd ?? updated.nextDueDate ?? null,
        quote,
      }, actor, 'Subscription', subscription.id);
      return {
        changed: true,
        scheduled: true,
        seatQuantity: updated.seatQuantity,
        pendingSeatQuantity: updated.pendingSeatQuantity,
        effectiveAt: updated.currentPeriodEnd ?? updated.nextDueDate,
        quote,
      };
    }

    const asaasSubscriptionId = subscription.asaasSubscriptionId || subscription.company.asaasSubscriptionId;
    if (asaasSubscriptionId && this.asaas.isConfigured()) {
      await this.asaas.updateSubscription(asaasSubscriptionId, { value: quote.total });
    }

    const updated = await this.prisma.companySubscription.update({
      where: { companyId },
      data: {
        seatQuantity: nextSeatQuantity,
        pendingSeatQuantity: null,
        pricingVersion: subscription.plan.pricingVersion,
        baseMonthlyPrice: subscription.plan.baseMonthlyPrice,
        userMonthlyPrice: subscription.plan.userMonthlyPrice,
        discountPercent: subscription.plan.discountPercent,
      },
    });

    await this.audit(companyId, 'SEATS_QUANTITY_CHANGED', {
      currentSeatQuantity: subscription.seatQuantity,
      nextSeatQuantity,
      usedSeats,
      quote,
      subscriptionId: updated.id,
      asaasSubscriptionId,
    }, actor, 'Subscription', updated.id);

    return { changed: true, scheduled: false, seatQuantity: updated.seatQuantity, pendingSeatQuantity: null, quote };
  }

  async changeCompanyPlan(companyId: string, newPlanId: string, actor?: JwtUser) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        document: true,
        platformPlanId: true,
        asaasCustomerId: true,
        asaasSubscriptionId: true,
      },
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
      const cycleMonths = newPlan.cycle === 'YEARLY' ? 12 : newPlan.cycle === 'SEMIANNUALLY' ? 6 : newPlan.cycle === 'QUARTERLY' ? 3 : 1;
      const nextDueDate = new Date();
      nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + cycleMonths);

      try {
        const subscription = await this.asaas.createSubscription(customerId, {
          value: Number(newPlan.price),
          nextDueDate: nextDueDate.toISOString().slice(0, 10),
          description: `Renovacao - Plano ${newPlan.name}`,
          cycle: ['MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY'].includes(newPlan.cycle) ? newPlan.cycle as any : 'MONTHLY',
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
    await this.ensureCompanyOnboardingBilling(companyId, actor);
    await this.audit(companyId, 'PLAN_CHANGED', {
      previousPlanId: company.platformPlanId ?? null,
      nextPlanId: newPlan.id,
      nextPlanName: newPlan.name,
      subscriptionId,
      customerId,
    }, actor, 'Company', companyId);

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
    const cycleMonths = cycle === 'YEARLY' ? 12 : cycle === 'SEMIANNUALLY' ? 6 : cycle === 'QUARTERLY' ? 3 : 1;
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
    const now = new Date();
    const companyScope = {
      status: 'ACTIVE' as const,
      ...(commercialOwnerId ? { commercialOwnerId } : {}),
    };
    const [invoices, activeSubscriptions, activeCompaniesWithoutSub, manualContracts] = await Promise.all([
      this.prisma.platformInvoice.findMany({
        where,
        select: { amount: true, status: true, dueDate: true, paidAt: true },
      }),
      this.prisma.companySubscription.findMany({
        where: {
          status: 'ACTIVE',
          company: companyScope,
        },
        include: {
          plan: true,
          company: { select: { id: true, name: true } },
        },
      }),
      this.prisma.company.findMany({
        where: {
          ...companyScope,
          plan: { not: 'FREE' },
          subscription: null,
        },
        include: { platformPlan: true },
      }),
      this.prisma.manualContract.findMany({
        where: {
          status: 'ACTIVE',
          company: companyScope,
        },
        include: { company: { select: { id: true, name: true } } },
      }),
    ]);

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

    type MrrIssue = {
      companyId: string;
      companyName: string;
      code: 'INCOMPLETE_SUBSCRIPTION' | 'MISSING_PRICING' | 'MULTIPLE_ACTIVE_CONTRACTS' | 'MULTIPLE_RECURRING_SOURCES';
      message: string;
    };

    const issues: MrrIssue[] = [];
    const contractsByCompany = new Map<string, typeof manualContracts>();
    for (const contract of manualContracts) {
      if (contract.startsAt > now || (contract.endsAt && contract.endsAt < now)) continue;
      const contracts = contractsByCompany.get(contract.companyId) ?? [];
      contracts.push(contract);
      contractsByCompany.set(contract.companyId, contracts);
    }

    const subscriptionCompanies = new Set(activeSubscriptions.map((subscription) => subscription.companyId));
    const includedCompanies = new Set<string>();
    const sourceCounts = { subscriptions: 0, contracts: 0, plans: 0 };
    let mrrCents = 0;

    const toNonNegativeCents = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) return null;
      return Math.round(parsed * 100);
    };

    const monthlyPricingCents = (
      baseValue: unknown,
      userValue: unknown,
      seatQuantity: unknown,
      discountValue: unknown,
      allowZero: boolean,
    ): number | null => {
      const baseCents = toNonNegativeCents(baseValue);
      const userCents = toNonNegativeCents(userValue);
      const seats = Number(seatQuantity);
      const discount = discountValue === null || discountValue === undefined ? 0 : Number(discountValue);
      if (
        baseCents === null ||
        userCents === null ||
        !Number.isInteger(seats) ||
        seats < 1 ||
        !Number.isFinite(discount) ||
        discount < 0 ||
        discount > 100
      ) {
        return null;
      }
      const discountedBaseCents = Math.round(baseCents * (100 - discount) / 100);
      const totalCents = discountedBaseCents + userCents * seats;
      return totalCents > 0 || allowZero ? totalCents : null;
    };

    for (const subscription of activeSubscriptions) {
      const plan = subscription.plan;
      const planBase = Number(plan?.baseMonthlyPrice ?? 0) > 0
        ? plan?.baseMonthlyPrice
        : plan?.price;
      const amountCents = monthlyPricingCents(
        subscription.baseMonthlyPrice ?? planBase,
        subscription.userMonthlyPrice ?? plan?.userMonthlyPrice,
        subscription.seatQuantity,
        subscription.discountPercent ?? plan?.discountPercent,
        Boolean(plan?.isFree),
      );
      const companyContracts = contractsByCompany.get(subscription.companyId) ?? [];

      if (companyContracts.length > 0) {
        issues.push({
          companyId: subscription.companyId,
          companyName: subscription.company.name,
          code: 'MULTIPLE_RECURRING_SOURCES',
          message: 'Empresa possui assinatura e contrato manual ativos; o MRR considera somente a assinatura.',
        });
      }

      if (amountCents === null) {
        issues.push({
          companyId: subscription.companyId,
          companyName: subscription.company.name,
          code: 'INCOMPLETE_SUBSCRIPTION',
          message: 'Assinatura ativa sem preço, desconto ou quantidade de licenças válidos.',
        });
        continue;
      }

      mrrCents += amountCents;
      includedCompanies.add(subscription.companyId);
      sourceCounts.subscriptions += 1;
    }

    for (const company of activeCompaniesWithoutSub) {
      const contracts = contractsByCompany.get(company.id) ?? [];
      if (contracts.length > 1) {
        issues.push({
          companyId: company.id,
          companyName: company.name,
          code: 'MULTIPLE_ACTIVE_CONTRACTS',
          message: 'Empresa possui mais de um contrato manual vigente; o valor foi excluído por ambiguidade.',
        });
        continue;
      }

      if (contracts.length === 1) {
        const contractCents = toNonNegativeCents(contracts[0].agreedAmount);
        if (contractCents !== null && contractCents > 0) {
          mrrCents += contractCents;
          includedCompanies.add(company.id);
          sourceCounts.contracts += 1;
          continue;
        }
      }

      const plan = company.platformPlan;
      const planBase = Number(plan?.baseMonthlyPrice ?? 0) > 0
        ? plan?.baseMonthlyPrice
        : plan?.price;
      const planCents = plan
        ? monthlyPricingCents(
            planBase,
            plan.userMonthlyPrice,
            company.maxUsers,
            plan.discountPercent,
            plan.isFree,
          )
        : null;

      if (planCents === null) {
        issues.push({
          companyId: company.id,
          companyName: company.name,
          code: 'MISSING_PRICING',
          message: 'Empresa ativa em plano pago sem assinatura, contrato vigente ou preço de plano completo.',
        });
        continue;
      }

      mrrCents += planCents;
      includedCompanies.add(company.id);
      sourceCounts.plans += 1;
    }

    // Contracts can belong to a company whose legacy plan enum is FREE. They remain
    // recurring revenue when there is no active subscription and the contract is unambiguous.
    for (const [companyId, contracts] of contractsByCompany) {
      if (subscriptionCompanies.has(companyId) || includedCompanies.has(companyId)) continue;
      const company = contracts[0]?.company;
      if (!company) continue;
      if (contracts.length > 1) {
        issues.push({
          companyId,
          companyName: company.name,
          code: 'MULTIPLE_ACTIVE_CONTRACTS',
          message: 'Empresa possui mais de um contrato manual vigente; o valor foi excluído por ambiguidade.',
        });
        continue;
      }
      const contractCents = toNonNegativeCents(contracts[0].agreedAmount);
      if (contractCents === null || contractCents <= 0) {
        issues.push({
          companyId,
          companyName: company.name,
          code: 'MISSING_PRICING',
          message: 'Contrato manual vigente sem valor mensal válido.',
        });
        continue;
      }
      mrrCents += contractCents;
      includedCompanies.add(companyId);
      sourceCounts.contracts += 1;
    }

    const calculatedMrr = mrrCents / 100;

    return {
      totals,
      mrr: calculatedMrr,
      count: invoices.length,
      activeSubscriptions: activeSubscriptions.length,
      conversionRate: totals.billed > 0 ? Number(((totals.received / totals.billed) * 100).toFixed(1)) : 0,
      monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
      mrrQuality: {
        status: issues.length === 0 ? 'COMPLETE' : 'PARTIAL',
        currency: 'BRL',
        includedCompanies: includedCompanies.size,
        incompleteCompanies: new Set(issues.map((issue) => issue.companyId)).size,
        sources: sourceCounts,
        issues,
      },
    };
  }

  async statementPdf(query: ListPlatformInvoicesDto, commercialOwnerId: string | undefined, actor: any, res: any) {
    const pdfQuery = { ...query, page: 1, limit: 500 };
    const [summary, page] = await Promise.all([
      this.summary(pdfQuery, commercialOwnerId),
      this.list(pdfQuery, commercialOwnerId),
    ]);

    const isFastify = typeof res.raw !== 'undefined';
    const stream = isFastify ? res.raw : res;
    const fileName = `extrato-financeiro-${new Date().toISOString().slice(0, 10)}.pdf`;

    if (isFastify) {
      stream.setHeader('Content-Type', 'application/pdf');
      stream.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    } else {
      res.header('Content-Type', 'application/pdf');
      res.header('Content-Disposition', `attachment; filename=${fileName}`);
    }

    const pdfkit = await import('pdfkit');
    const doc = new pdfkit.default({ margin: 38, size: 'A4', bufferPages: true });
    doc.pipe(stream);

    const title = 'Extrato Financeiro da Plataforma';
    const subtitleParts = [
      query.from ? `De ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(query.from))}` : null,
      query.to ? `Até ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(query.to))}` : null,
      query.status ? `Status ${query.status}` : null,
      actor?.name ? `Solicitado por ${actor.name}` : null,
    ].filter(Boolean);

    const money = (value: number | string | null | undefined) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const date = (value?: Date | string | null) => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value)) : '-';

    doc.font('Helvetica-Bold').fontSize(15).fillColor('#0f172a').text(title, { align: 'center' });
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(subtitleParts.join(' • ') || 'Todos os registros selecionados', { align: 'center' });
    doc.moveDown(0.8);

    doc.roundedRect(38, doc.y, 519, 78, 12).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('Resumo', 54, doc.y + 12);
    const top = doc.y + 18;
    const boxes = [
      { label: 'Faturado', value: money(summary.totals.billed) },
      { label: 'Recebido', value: money(summary.totals.received) },
      { label: 'Em aberto', value: money(summary.totals.open) },
      { label: 'Em atraso', value: money(summary.totals.overdue) },
    ];
    boxes.forEach((box, index) => {
      const x = 54 + (index * 125);
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(box.label, x, top + 8);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(box.value, x, top + 23);
    });

    doc.y = 152;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('Faturas', 38, doc.y);
    doc.moveDown(0.5);

    const headerY = doc.y;
    const columns = [
      { key: 'empresa', label: 'Empresa', width: 126 },
      { key: 'cobranca', label: 'Cobrança', width: 114 },
      { key: 'vencimento', label: 'Vencimento', width: 74 },
      { key: 'valor', label: 'Valor', width: 74 },
      { key: 'status', label: 'Status', width: 64 },
      { key: 'integracao', label: 'Integração', width: 63 },
    ];
    let x = 38;
    doc.roundedRect(38, headerY - 4, 519, 18, 5).fill('#f1f5f9');
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8);
    columns.forEach((column) => {
      doc.text(column.label, x + 3, headerY, { width: column.width - 6 });
      x += column.width;
    });
    doc.moveDown(1);

    const invoices = page.items.slice(0, 80);
    if (!invoices.length) {
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Nenhuma fatura encontrada para este filtro.', 38, doc.y + 10);
    } else {
      invoices.forEach((invoice) => {
        const rowY = doc.y + 3;
        const status = String(invoice.status || '').toUpperCase();
        const statusColor = status === 'PAID' ? '#047857' : status === 'OVERDUE' ? '#be123c' : status === 'CANCELED' ? '#475569' : '#0369a1';
        const bg = rowY + 16;
        doc.roundedRect(38, rowY - 2, 519, 18, 4).strokeColor('#e2e8f0').stroke();
        doc.fillColor('#0f172a').font('Helvetica').fontSize(7.5);
        doc.text(invoice.company?.name || 'Empresa', 41, rowY, { width: 120 });
        doc.text(invoice.description || 'Mensalidade', 167, rowY, { width: 108 });
        doc.text(date(invoice.dueDate), 281, rowY, { width: 68 });
        doc.text(money(invoice.amount), 355, rowY, { width: 68 });
        doc.fillColor(statusColor).font('Helvetica-Bold').text(status || 'OPEN', 429, rowY, { width: 56 });
        doc.fillColor('#0f766e').font('Helvetica-Bold').text(invoice.asaasPaymentId ? 'Asaas' : 'Local', 493, rowY, { width: 56 });
        doc.y = bg;
        if (doc.y > 720) {
          doc.addPage();
          doc.y = 48;
        }
      });
    }

    doc.moveDown(1);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
      .text(`Gerado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`, { align: 'right' });

    doc.end();
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
      items: items.map(item => ({ ...item, amount: Number(item.amount) })),
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
    if (dto.sendToAsaas && this.asaas.isConfigured() && company.asaasCustomerId) {
      try {
        payment = await this.asaas.createCharge(company.asaasCustomerId, {
          value: dto.amount,
          dueDate: dto.dueDate.slice(0, 10),
          description: dto.description,
          billingType: dto.billingType,
          externalReference: dto.companyId,
        });
      } catch (err) {
        this.logger.warn(`Falha ao criar cobrança no Asaas, registrando localmente: ${String(err)}`);
      }
    }

    return this.prisma.platformInvoice.create({
      data: {
        companyId: dto.companyId,
        planId: dto.planId,
        description: dto.description,
        amount: Number(dto.amount),
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
        amount: dto.amount !== undefined ? Number(dto.amount) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        billingType: dto.billingType,
        status: dto.status,
        paidAt: dto.status === 'PAID' ? invoice.paidAt ?? new Date() : dto.status ? null : undefined,
      },
      include: { company: { select: { id: true, name: true } }, plan: { select: { id: true, name: true } } },
    });
  }

  async sync(id: string, actor?: JwtUser) {
    const invoice = await this.findActive(id);
    if (!invoice.asaasPaymentId) throw new BadRequestException('Esta fatura e somente local.');
    const payment = await this.asaas.getCharge(invoice.asaasPaymentId);
    const status = this.mapAsaasStatus(payment.status) ?? invoice.status;
    const updated = await this.prisma.platformInvoice.update({
      where: { id },
      data: {
        status,
        invoiceUrl: payment.invoiceUrl ?? invoice.invoiceUrl,
        paidAt: this.isPaid(payment.status) ? invoice.paidAt ?? new Date() : invoice.paidAt,
      },
      include: { company: { select: { id: true, name: true } }, plan: { select: { id: true, name: true } } },
    });
    await this.audit(invoice.companyId, 'INVOICE_SYNCED', {
      invoiceId: invoice.id,
      previousStatus: invoice.status,
      nextStatus: updated.status,
      asaasPaymentId: invoice.asaasPaymentId,
    }, actor, 'Billing', invoice.id);
    return updated;
  }

  async remove(id: string, actor?: JwtUser) {
    const invoice = await this.findActive(id);
    if (invoice.asaasPaymentId && invoice.status !== 'PAID' && invoice.status !== 'CANCELED') {
      try {
        await this.asaas.deleteCharge(invoice.asaasPaymentId);
      } catch (err) {
        this.logger.warn(`Asaas falhou ao deletar cobranca ${invoice.asaasPaymentId}: ${String(err)}`);
      }
    }
    await this.prisma.platformInvoice.update({
      where: { id },
      data: { status: 'CANCELED', deletedAt: new Date() },
    });
    this.logger.log(`Fatura ${id} cancelada e removida da listagem.`);
    await this.audit(invoice.companyId, 'INVOICE_CANCELED', {
      invoiceId: invoice.id,
      previousStatus: invoice.status,
      asaasPaymentId: invoice.asaasPaymentId ?? null,
    }, actor, 'Billing', invoice.id);
    return { id };
  }

  async requestRefund(id: string, companyId?: string, actor?: JwtUser) {
    const invoice = await this.prisma.platformInvoice.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!invoice) throw new NotFoundException('Fatura nao encontrada.');
    if (invoice.status !== 'PAID') throw new BadRequestException('A fatura precisa estar paga para ser estornada.');

    const paidAt = invoice.paidAt || new Date();
    const daysSincePayment = (new Date().getTime() - paidAt.getTime()) / (1000 * 3600 * 24);

    if (invoice.asaasPaymentId && daysSincePayment <= 7) {
      try {
        await this.asaas.refundPayment(invoice.asaasPaymentId);
      } catch (error) {
        this.logger.error(`Falha ao solicitar estorno da fatura ${id}: ${String(error)}`);
        throw new BadRequestException('O Asaas recusou o pedido de estorno. Verifique o saldo ou realize o estorno manualmente.');
      }
    }

    const updated = await this.prisma.platformInvoice.update({
      where: { id },
      data: { status: 'CANCELED' },
      include: { company: { select: { id: true, name: true } }, plan: { select: { id: true, name: true } } },
    });

    if (daysSincePayment <= 7) {
      await this.prisma.company.update({
        where: { id: invoice.companyId },
        data: { status: 'SUSPENDED', isActive: false, billingStatus: 'PAST_DUE', suspensionReason: 'pagamento_estornado_7_dias' },
      });
    } else {
      await this.prisma.company.update({
        where: { id: invoice.companyId },
        data: { status: 'ACTIVE', isActive: true, billingStatus: 'CANCELED', suspensionReason: 'cancelamento_aviso_30_dias' },
      });
    }

    await this.audit(invoice.companyId, 'INVOICE_REFUND_REQUESTED', {
      invoiceId: invoice.id,
      paidAt: paidAt.toISOString(),
      daysSincePayment: Number(daysSincePayment.toFixed(1)),
      refundedWithinWindow: daysSincePayment <= 7,
    }, actor, 'Billing', invoice.id);

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
