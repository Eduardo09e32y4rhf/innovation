import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { competenceOf, monthWindow } from '../accounting/platform-ledger';
import { PlatformLedgerService } from '../accounting/platform-ledger.service';
import { AsaasService } from './asaas.service';
import { buildMonthlyReport, reportToCsv, type ReportInvoice } from './platform-revenue-report';

const BACKFILL_LIMIT = 200;
const invoiceSelect = { id: true, companyId: true, planId: true, amount: true, refundedAmount: true, paidAt: true, gatewayNetValue: true, provider: true, asaasPaymentId: true } as const;
const toInvoice = (row: any): ReportInvoice & { asaasPaymentId?: string | null } => ({
  id: row.id, companyId: row.companyId, planId: row.planId ?? null, amount: Number(row.amount), refundedAmount: Number(row.refundedAmount ?? 0),
  paidAt: row.paidAt ?? null, gatewayNetValue: row.gatewayNetValue === null || row.gatewayNetValue === undefined ? null : Number(row.gatewayNetValue),
  provider: row.provider, asaasPaymentId: row.asaasPaymentId ?? null,
});

/** Relatório contábil mensal da receita da plataforma (DEV, CEO, CONTABIL). Só leitura, exceto o preenchimento do líquido do Asaas que falta. */
@Injectable()
export class PlatformRevenueReportService {
  private readonly logger = new Logger(PlatformRevenueReportService.name);
  private readonly ledger: PlatformLedgerService;

  constructor(private readonly prisma: PrismaService, private readonly asaas: AsaasService) {
    this.ledger = new PlatformLedgerService(prisma);
  }

  async monthly(month?: string) {
    const target = month ?? competenceOf(new Date());
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(target)) throw new BadRequestException('Mes invalido. Use AAAA-MM.');
    const { start, end } = monthWindow(target);

    const ledger = await this.ledger.month(target);
    const invoiceIds = [...new Set(ledger.entries.map((entry) => entry.invoiceId))];
    const [rawInvoices, rawPaid, adjustments, plans] = await Promise.all([
      invoiceIds.length ? this.prisma.platformInvoice.findMany({ where: { id: { in: invoiceIds } }, select: invoiceSelect }) : Promise.resolve([]),
      this.prisma.platformInvoice.findMany({ where: { status: 'PAID', deletedAt: null, paidAt: { lt: end } }, select: invoiceSelect, orderBy: { paidAt: 'asc' } }),
      this.prisma.invoiceAdjustment.findMany({ where: { type: 'SUBSCRIPTION_CANCELED', createdAt: { lt: end } }, select: { companyId: true, createdAt: true, metadata: true } }),
      this.prisma.platformPlan.findMany({ select: { id: true, name: true, cycle: true, commitmentMonths: true } }),
    ]);

    const entryInvoices = (rawInvoices as any[]).map(toInvoice);
    await this.fillGatewayNetValues(entryInvoices, ledger.entries.filter((entry) => entry.kind === 'RECEIPT').map((entry) => entry.invoiceId));

    // Cancelamento "no fim do ciclo" só vira cancelamento quando o cron aplica (registro NOW); o pedido não conta.
    const cancellations = (adjustments as any[])
      .filter((row) => (row.metadata as any)?.mode !== 'END_OF_CYCLE')
      .map((row) => ({ companyId: row.companyId as string, at: row.createdAt as Date }));

    const report = buildMonthlyReport({
      month: target, start, end, entries: ledger.entries, entryInvoices, paidUntilEnd: (rawPaid as any[]).map(toInvoice), cancellations, plans: plans as any[],
    });
    const ledgerNet = ledger.total.netRevenue;
    const reportedNet = Math.round((report.totals.grossReceipts - report.totals.refunds) * 100);
    return {
      ...report,
      ledger: { grossReceipts: ledger.total.grossReceipts, refunds: ledger.total.refunds, netRevenue: ledgerNet, reconciles: Math.round(ledgerNet * 100) === reportedNet },
    };
  }

  async monthlyCsv(month?: string) {
    const report = await this.monthly(month);
    return { filename: `receita-plataforma-${report.month}.csv`, content: reportToCsv(report) };
  }

  /** Quando a fatura paga do Asaas não tem o líquido gravado (pagamento anterior à migration), consulta o Asaas e grava. */
  private async fillGatewayNetValues(invoices: Array<ReportInvoice & { asaasPaymentId?: string | null }>, receiptInvoiceIds: string[]) {
    if (!this.asaas.isConfigured()) return;
    const wanted = new Set(receiptInvoiceIds);
    const missing = invoices.filter((invoice) => wanted.has(invoice.id) && invoice.gatewayNetValue === null && invoice.provider === 'ASAAS' && invoice.asaasPaymentId).slice(0, BACKFILL_LIMIT);
    for (const invoice of missing) {
      try {
        const charge = await this.asaas.getCharge(invoice.asaasPaymentId as string);
        if (typeof charge?.netValue !== 'number' || !Number.isFinite(charge.netValue) || charge.netValue < 0) continue;
        await this.prisma.platformInvoice.update({ where: { id: invoice.id }, data: { gatewayNetValue: charge.netValue } });
        invoice.gatewayNetValue = charge.netValue;
      } catch (error) {
        this.logger.warn(`Nao foi possivel obter o liquido do Asaas da fatura ${invoice.id}: ${String(error)}`);
      }
    }
  }
}
