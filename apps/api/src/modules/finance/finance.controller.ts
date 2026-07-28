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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'COMERCIAL')
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly service: PlatformFinanceService,
    private readonly prisma: PrismaService,
    @InjectQueue('asaas-webhook') private readonly webhookQueue: Queue,
  ) {}

  @Get('platform/summary')
  summary(@CurrentUser() actor: JwtUser, @Query() query: ListPlatformInvoicesDto) {
    return this.service.summary(query, actor.role === 'COMERCIAL' ? actor.sub : undefined);
  }

  @Get('platform/statements/pdf')
  async statementPdf(@CurrentUser() actor: JwtUser, @Query() query: ListPlatformInvoicesDto, @Res() res: any) {
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

  @Post('platform/companies/:companyId/checkout')
  @Roles('DEV')
  companyCheckout(@Param('companyId') companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.ensureCompanyOnboardingBilling(companyId, actor);
  }

  @Post('platform/invoices')
  @Roles('DEV')
  create(@Body() dto: CreatePlatformInvoiceDto) {
    return this.service.create(dto);
  }

  @Patch('platform/invoices/:id')
  @Roles('DEV')
  update(@Param('id') id: string, @Body() dto: UpdatePlatformInvoiceDto) {
    return this.service.update(id, dto);
  }

  @Post('platform/invoices/:id/sync')
  @Roles('DEV')
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
  @Roles('DEV')
  remove(@Param('id') id: string, @CurrentUser() actor: JwtUser) {
    return this.service.remove(id, actor);
  }

  @Post('platform/invoices/:id/refund')
  @Roles('DEV')
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
