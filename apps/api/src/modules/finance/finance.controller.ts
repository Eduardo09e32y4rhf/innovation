import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { AuditLogsQueryDto, CreatePlatformInvoiceDto, ListPlatformInvoicesDto, UpdatePlatformInvoiceDto } from './dto/platform-finance.dto';
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
  @Roles('DEV', 'CEO')
  async auditLogs(@Query() query: AuditLogsQueryDto) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(query.companyId ? { companyId: query.companyId } : {}),
        entity: { in: ['Company', 'Billing', 'Subscription'] },
      },
      include: {
        company: { select: { id: true, name: true, document: true, plan: true, billingStatus: true, status: true, subscriptionStartedAt: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 60,
    });
  }

  @Get('platform/webhook-events')
  @Roles('DEV', 'CEO')
  async webhookEvents(@Query() query: AuditLogsQueryDto) {
    const take = query.limit ?? 50;
    let where: Record<string, unknown> | undefined;
    if (query.companyId) {
      const company = await this.prisma.company.findUnique({ where: { id: query.companyId }, select: { id: true, asaasCustomerId: true } });
      if (!company) return [];
      where = {
        OR: [
          ...(company.asaasCustomerId ? [{ payload: { path: ['payment', 'customer'], equals: company.asaasCustomerId } }] : []),
          { payload: { path: ['payment', 'externalReference'], equals: company.id } },
          { payload: { path: ['payment', 'externalReference'], equals: `signup:${company.id}` } },
        ],
      };
    }
    const events = await this.prisma.asaasWebhookEvent.findMany({ where: where as any, orderBy: { createdAt: 'desc' }, take });
    const customers = new Set<string>();
    const references = new Set<string>();
    for (const event of events) {
      const payment = (event.payload as any)?.payment ?? {};
      if (payment.customer) customers.add(String(payment.customer));
      const reference = String(payment.externalReference || '').replace(/^signup:/, '');
      if (/^[0-9a-f-]{36}$/i.test(reference)) references.add(reference);
    }
    const companies = customers.size || references.size
      ? await this.prisma.company.findMany({
          where: { OR: [...(customers.size ? [{ asaasCustomerId: { in: [...customers] } }] : []), ...(references.size ? [{ id: { in: [...references] } }] : [])] },
          select: { id: true, name: true, asaasCustomerId: true },
        })
      : [];
    const byCustomer = new Map(companies.filter((item) => item.asaasCustomerId).map((item) => [item.asaasCustomerId as string, item]));
    const byId = new Map(companies.map((item) => [item.id, item]));
    return events.map((event) => {
      const payment = (event.payload as any)?.payment ?? {};
      const reference = String(payment.externalReference || '').replace(/^signup:/, '');
      const company = byCustomer.get(payment.customer) || byId.get(reference);
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
    });
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
