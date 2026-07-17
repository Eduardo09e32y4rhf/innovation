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

  private isPaid(status?: string) {
    return !!status && ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status);
  }
}