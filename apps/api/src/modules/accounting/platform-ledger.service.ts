import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { buildLedger, competenceOf, LEDGER_ACCOUNTS, monthWindow, summarizeLedger, type LedgerInvoiceInput } from './platform-ledger';

const invoiceSelect = {
  id: true, companyId: true, provider: true, description: true, amount: true, status: true, paidAt: true,
  refundedAmount: true, refundStatus: true, invoiceStatus: true, invoiceNumber: true,
} as const;

const toInput = (row: any): LedgerInvoiceInput => ({ ...row, amount: Number(row.amount), refundedAmount: Number(row.refundedAmount ?? 0) });

/** Razão da receita de assinaturas (recebimentos e devoluções) de um mês, para a aba contábil. Só leitura. */
@Injectable()
export class PlatformLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async month(month?: string, companyId?: string) {
    const target = month ?? competenceOf(new Date());
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(target)) throw new BadRequestException('Mes invalido. Use AAAA-MM.');
    const { start, end } = monthWindow(target);
    const scope = companyId ? { companyId } : {};

    const [paid, confirmed, adjustments] = await Promise.all([
      this.prisma.platformInvoice.findMany({ where: { ...scope, deletedAt: null, status: 'PAID', paidAt: { gte: start, lt: end } }, select: invoiceSelect }),
      this.prisma.paymentRefund.findMany({ where: { status: 'CONFIRMED', confirmedAt: { gte: start, lt: end }, invoice: { ...scope, deletedAt: null } }, select: { id: true, invoiceId: true, amount: true, confirmedAt: true, status: true } }),
      this.prisma.invoiceAdjustment.findMany({ where: { ...scope, type: 'PARTIAL_REFUND', invoiceId: { not: null }, createdAt: { gte: start, lt: end } }, select: { id: true, invoiceId: true, amount: true, createdAt: true } }),
    ]);

    // Faturas tocadas no mês (recebimento ou devolução). Para os alertas precisamos do histórico completo de devoluções de cada uma.
    const invoiceIds = [...new Set([...paid.map((row) => row.id), ...confirmed.map((row) => row.invoiceId), ...adjustments.map((row) => row.invoiceId as string)])];
    const [invoices, allConfirmed, allAdjustments] = invoiceIds.length
      ? await Promise.all([
          this.prisma.platformInvoice.findMany({ where: { id: { in: invoiceIds } }, select: invoiceSelect }),
          this.prisma.paymentRefund.findMany({ where: { invoiceId: { in: invoiceIds }, status: 'CONFIRMED' }, select: { id: true, invoiceId: true, amount: true, confirmedAt: true, status: true } }),
          this.prisma.invoiceAdjustment.findMany({ where: { invoiceId: { in: invoiceIds }, type: 'PARTIAL_REFUND' }, select: { id: true, invoiceId: true, amount: true, createdAt: true } }),
        ])
      : [[], [], []];

    const full = buildLedger({
      invoices: invoices.map(toInput),
      refunds: allConfirmed.map((row) => ({ ...row, amount: Number(row.amount) })),
      adjustments: allAdjustments.map((row) => ({ id: row.id, invoiceId: row.invoiceId as string, amount: Number(row.amount ?? 0), createdAt: row.createdAt })),
    });
    const entries = full.entries.filter((entry) => entry.competence === target);
    return { month: target, accounts: LEDGER_ACCOUNTS, entries, ...summarizeLedger(entries), issues: full.issues };
  }
}
