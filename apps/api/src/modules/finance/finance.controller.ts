import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreatePlatformInvoiceDto, ListPlatformInvoicesDto, UpdatePlatformInvoiceDto } from './dto/platform-finance.dto';
import { PlatformFinanceService } from './platform-finance.service';
import { PrismaService } from '../../database/prisma.service';
import { TimeClosingService } from '../time-track/time-closing.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'COMERCIAL')
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly service: PlatformFinanceService,
    private readonly prisma: PrismaService,
    private readonly timeClosingService: TimeClosingService,
    @InjectQueue('asaas-webhook') private readonly webhookQueue: Queue,
  ) {}

  @Get('platform/summary')
  summary(@CurrentUser() actor: JwtUser, @Query() query: ListPlatformInvoicesDto) {
    return this.service.summary(query, actor.role === 'COMERCIAL' ? actor.sub : undefined);
  }

  @Get('platform/statements/pdf')
  async statementPdf(@CurrentUser() actor: JwtUser, @Query() query: ListPlatformInvoicesDto, @Res() res: import('express').Response) {
    return this.service.statementPdf(query, actor.role === 'COMERCIAL' ? actor.sub : undefined, actor, res);
  }

  @Get('platform/invoices')
  list(@CurrentUser() actor: JwtUser, @Query() query: ListPlatformInvoicesDto) {
    return this.service.list(query, actor.role === 'COMERCIAL' ? actor.sub : undefined);
  }

  @Get('accounting/overview')
  @Roles('DEV', 'CEO')
  async accountingOverview(@Query('month') month?: string) {
    const match = /^(\d{4})-(\d{2})$/.exec(month || '');
    const year = match ? Number(match[1]) : new Date().getUTCFullYear();
    const monthNumber = match ? Number(match[2]) : new Date().getUTCMonth() + 1;
    const periodStart = new Date(Date.UTC(year, monthNumber - 1, 1));
    const periodEnd = new Date(Date.UTC(year, monthNumber, 1));

    const [companies, closings, payrolls, invoices] = await Promise.all([
      this.prisma.company.findMany({
        select: { id: true, name: true, document: true, status: true, billingStatus: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.timeClosing.findMany({
        where: { periodStart: { gte: periodStart, lt: periodEnd } },
        select: {
          id: true, companyId: true, status: true, periodStart: true, periodEnd: true,
          grossPay: true, netPay: true, updatedAt: true,
          company: { select: { name: true } }, employee: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      this.prisma.payroll.findMany({
        where: { referenceYear: year, referenceMonth: monthNumber, deletedAt: null },
        select: {
          id: true, companyId: true, status: true, baseSalary: true, grossSalary: true, netSalary: true,
          updatedAt: true, employee: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      this.prisma.platformInvoice.findMany({
        where: { dueDate: { gte: periodStart, lt: periodEnd }, deletedAt: null },
        select: { id: true, companyId: true, amount: true, status: true, dueDate: true, invoiceNumber: true, nfeStatus: true },
        orderBy: { dueDate: 'asc' },
        take: 5000,
      }),
    ]);

    const companyRows = companies.map((company) => {
      const companyClosings = closings.filter((item) => item.companyId === company.id);
      const companyPayrolls = payrolls.filter((item) => item.companyId === company.id);
      const companyInvoices = invoices.filter((item) => item.companyId === company.id);
      return {
        ...company,
        closings: companyClosings.length,
        closingsInReview: companyClosings.filter((item) => item.status === 'DRAFT' || item.status === 'IN_REVIEW').length,
        payrolls: companyPayrolls.length,
        payrollsPending: companyPayrolls.filter((item) => item.status === 'DRAFT' || item.status === 'PROCESSING').length,
        invoices: companyInvoices.length,
        invoicesOverdue: companyInvoices.filter((item) => item.status === 'OVERDUE').length,
        invoiceTotal: companyInvoices.reduce((total, item) => total + Number(item.amount), 0),
      };
    });

    return {
      period: { year, month: monthNumber, key: `${year}-${String(monthNumber).padStart(2, '0')}` },
      metrics: {
        companies: companies.length,
        closings: closings.length,
        closingsInReview: closings.filter((item) => item.status === 'DRAFT' || item.status === 'IN_REVIEW').length,
        payrolls: payrolls.length,
        payrollsPending: payrolls.filter((item) => item.status === 'DRAFT' || item.status === 'PROCESSING').length,
        invoiceTotal: invoices.reduce((total, item) => total + Number(item.amount), 0),
        invoicesOverdue: invoices.filter((item) => item.status === 'OVERDUE').length,
        invoicesWithoutFiscalNumber: invoices.filter((item) => !item.invoiceNumber && item.status !== 'CANCELED').length,
      },
      companies: companyRows,
      recentClosings: closings.slice(0, 80),
      recentPayrolls: payrolls.slice(0, 80),
      recentInvoices: invoices.slice(0, 80),
    };
  }

  @Get('accounting/companies/:companyId/closings')
  @Roles('DEV', 'CEO')
  async accountingCompanyClosings(@Param('companyId') companyId: string, @Query('month') month?: string) {
    const match = /^(\d{4})-(\d{2})$/.exec(month || '');
    const year = match ? Number(match[1]) : new Date().getUTCFullYear();
    const monthNumber = match ? Number(match[2]) : new Date().getUTCMonth() + 1;
    const periodStart = new Date(Date.UTC(year, monthNumber - 1, 1));
    const periodEnd = new Date(Date.UTC(year, monthNumber, 1));
    return this.prisma.timeClosing.findMany({
      where: { companyId, periodStart: { gte: periodStart, lt: periodEnd } },
      include: { employee: { select: { name: true, position: true } }, adjustments: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: [{ status: 'asc' }, { employee: { name: 'asc' } }],
    });
  }

  @Get('accounting/companies/:companyId/payroll')
  @Roles('DEV', 'CEO')
  async accountingCompanyPayroll(@Param('companyId') companyId: string, @Query('month') month?: string) {
    const match = /^(\d{4})-(\d{2})$/.exec(month || '');
    const year = match ? Number(match[1]) : new Date().getUTCFullYear();
    const monthNumber = match ? Number(match[2]) : new Date().getUTCMonth() + 1;
    return this.prisma.payroll.findMany({
      where: { companyId, referenceYear: year, referenceMonth: monthNumber, deletedAt: null },
      include: { employee: { select: { name: true, position: true } }, items: true },
      orderBy: { employee: { name: 'asc' } },
    });
  }

  @Patch('accounting/time-closings/:id/adjust')
  @Roles('DEV', 'CEO')
  async accountingAdjustClosing(@Param('id') id: string, @CurrentUser() actor: JwtUser, @Body() body: { field: string; newValue: string | number; reason: string }) {
    const closing = await this.prisma.timeClosing.findUnique({ where: { id }, select: { companyId: true } });
    if (!closing) throw new NotFoundException('Fechamento nao encontrado.');
    return this.timeClosingService.adjust(closing.companyId, actor, id, { ...body, newValue: String(body.newValue) });
  }

  @Patch('accounting/payroll/:id')
  @Roles('DEV', 'CEO')
  async accountingCorrectPayroll(@Param('id') id: string, @CurrentUser() actor: JwtUser, @Body() body: Record<string, unknown>) {
    const allowed = ['baseSalary', 'grossSalary', 'netSalary', 'inssAmount', 'irrfAmount', 'fgtsAmount', 'overtimeAmount', 'nightShiftAmount'];
    const reason = String(body.reason || '').trim();
    if (!reason) throw new BadRequestException('Informe o motivo da correção.');
    const payroll = await this.prisma.payroll.findFirst({ where: { id, deletedAt: null }, include: { employee: { select: { name: true, position: true } } } });
    if (!payroll) throw new NotFoundException('Folha nao encontrada.');
    if (!['DRAFT', 'PROCESSING'].includes(payroll.status)) throw new BadRequestException('Somente folhas em rascunho ou processamento podem ser corrigidas.');
    const changes: Record<string, number> = {};
    for (const field of allowed) {
      if (body[field] === undefined || body[field] === '') continue;
      const value = Number(body[field]);
      if (!Number.isFinite(value) || value < 0) throw new BadRequestException(`Valor invalido para ${field}.`);
      changes[field] = value;
    }
    if (!Object.keys(changes).length) throw new BadRequestException('Informe ao menos um valor para corrigir.');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payroll.update({ where: { id }, data: { ...changes, observations: `${payroll.observations ? `${payroll.observations}\n` : ''}[${new Date().toISOString()}] ${reason}` }, include: { employee: { select: { name: true, position: true } } } });
      await tx.auditLog.create({ data: { companyId: payroll.companyId, userId: actor.sub, action: 'ACCOUNTING_PAYROLL_CORRECTED', entity: 'Payroll', entityId: id, metadata: { reason, changes } } });
      return result;
    });
    return updated;
  }

  @Get('platform/companies/:companyId/invoices')
  companyInvoices(@CurrentUser() actor: JwtUser, @Param('companyId') companyId: string) {
    return this.service.listCompanyInvoices(companyId, actor.role === 'COMERCIAL' ? actor.sub : undefined);
  }

  @Post('platform/companies/:companyId/billing/pause')
  @Roles('DEV', 'CEO')
  pauseBilling(@Param('companyId') companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.pauseBilling(companyId, actor);
  }

  @Post('platform/companies/:companyId/billing/resume')
  @Roles('DEV', 'CEO')
  resumeBilling(@Param('companyId') companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.resumeBilling(companyId, actor);
  }

  @Post('platform/companies/:companyId/checkout')
  @Roles('DEV')
  companyCheckout(@Param('companyId') companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.ensureCompanyOnboardingBilling(companyId, actor);
  }

  @Post('platform/invoices')
  @Roles('DEV', 'CEO')
  create(@Body() dto: CreatePlatformInvoiceDto) {
    return this.service.create(dto);
  }

  @Patch('platform/invoices/:id')
  @Roles('DEV', 'CEO')
  update(@Param('id') id: string, @Body() dto: UpdatePlatformInvoiceDto) {
    return this.service.update(id, dto);
  }

  @Post('platform/invoices/:id/sync')
  @Roles('DEV', 'CEO')
  sync(@Param('id') id: string, @CurrentUser() actor: JwtUser) {
    return this.service.sync(id, actor);
  }

  @Get('platform/audit-logs')
  async auditLogs(@Query('companyId') companyId?: string, @Query('limit') limit?: string) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        entity: { in: ['Company', 'Billing', 'Subscription'] },
      },
      include: {
        company: { select: { id: true, name: true, document: true, plan: true, billingStatus: true, status: true, asaasCustomerId: true, asaasSubscriptionId: true, subscriptionStartedAt: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(Number(limit) || 60, 1), 200),
    });
  }

  @Get('platform/webhook-events')
  async webhookEvents(@Query('companyId') companyId?: string, @Query('limit') limit?: string) {
    const events = await this.prisma.asaasWebhookEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(Number(limit) || 50, 1), 200),
    });
    const companies = await this.prisma.company.findMany({
      select: { id: true, name: true, asaasCustomerId: true },
    });
    const byCustomer = new Map(companies.filter((item) => item.asaasCustomerId).map((item) => [item.asaasCustomerId as string, item]));
    const byId = new Map(companies.map((item) => [item.id, item]));
    return events
      .map((event) => {
        const payload = event.payload as any;
        const payment = payload?.payment || {};
        const externalReference = String(payment.externalReference || '').replace(/^signup:/, '');
        const company = byCustomer.get(payment.customer) || byId.get(externalReference);
        return {
          id: event.id,
          asaasEventId: event.asaasEventId,
          eventType: event.eventType,
          status: event.status,
          attempts: event.attempts,
          errorMessage: event.errorMessage,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          processedAt: event.processedAt,
          company: company ? { id: company.id, name: company.name } : null,
          paymentId: payment.id || null,
        };
      })
      .filter((event) => !companyId || event.company?.id === companyId);
  }

  @Post('platform/webhook-events/:id/retry')
  @Roles('DEV')
  async retryWebhookEvent(@Param('id') id: string) {
    const event = await this.prisma.asaasWebhookEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Evento Asaas nao encontrado.');
    if (event.status === 'PROCESSING') throw new BadRequestException('Evento ainda esta sendo processado.');
    if (event.status === 'PROCESSED') throw new BadRequestException('Evento ja foi processado com sucesso.');
    await this.prisma.asaasWebhookEvent.update({ where: { id }, data: { status: 'PENDING', errorMessage: null } });
    await this.webhookQueue.add('process', { eventId: id }, { attempts: 5, backoff: { type: 'exponential', delay: 10000 }, removeOnComplete: 500, removeOnFail: 1000 });
    return { queued: true, id };
  }

  @Delete('platform/invoices/:id')
  @Roles('DEV', 'CEO')
  remove(@Param('id') id: string, @CurrentUser() actor: JwtUser) {
    return this.service.remove(id, actor);
  }

  @Post('platform/invoices/:id/refund')
  @Roles('DEV', 'CEO')
  refund(@Param('id') id: string, @CurrentUser() actor: JwtUser) {
    return this.service.requestRefund(id, undefined, actor);
  }

  @Post('charge/:companyId')
  @Roles('DEV')
  createCompanyCharge(
    @Param('companyId') companyId: string,
    @Body() body: { amount: number; dueDate: string; description: string },
  ) {
    return this.service.create({
      companyId,
      amount: body.amount,
      dueDate: body.dueDate,
      description: body.description,
      billingType: 'UNDEFINED',
      sendToAsaas: true,
    });
  }
}
