/**
 * Razão simplificado da receita de assinaturas da plataforma (partida dobrada), derivado das faturas pagas e das devoluções confirmadas.
 * Não grava nada: é uma visão calculada, então não há como divergir do que a empresa vê em Faturas.
 * Regime de caixa: o recebimento entra na competência do mês do pagamento; a devolução reduz a receita na competência do mês em que foi CONFIRMADA.
 */
export const LEDGER_ACCOUNTS = {
  BANK: '1.1.1.01 Bancos - conta do gateway (Asaas / Mercado Pago)',
  REVENUE: '3.1.1.01 Receita de assinaturas (SaaS)',
  REFUNDS: '3.1.9.01 (-) Devolucoes e estornos de receita',
} as const;

export type LedgerKind = 'RECEIPT' | 'REFUND';

export interface LedgerInvoiceInput {
  id: string;
  companyId: string;
  provider: string;
  description: string | null;
  amount: number;
  status: string;
  paidAt: Date | null;
  refundedAmount: number;
  refundStatus: string | null;
  invoiceStatus: string | null;
  invoiceNumber: string | null;
}
export interface LedgerRefundInput { id: string; invoiceId: string; amount: number; confirmedAt: Date | null; status: string }
export interface LedgerAdjustmentInput { id: string; invoiceId: string; amount: number; createdAt: Date }

export interface LedgerEntry {
  id: string;
  kind: LedgerKind;
  date: string;
  competence: string;
  invoiceId: string;
  companyId: string;
  provider: string;
  description: string;
  amount: number;
  debit: string;
  credit: string;
}

export type LedgerIssueCode = 'REFUND_NOT_IN_LEDGER' | 'NFSE_MISSING' | 'NFSE_NOT_CANCELED_AFTER_REFUND' | 'NFSE_PARTIAL_REFUND_REVIEW';
export interface LedgerIssue { code: LedgerIssueCode; invoiceId: string; companyId: string; amount: number; message: string }

const cents = (value: number) => Math.round(value * 100);
const money = (centsValue: number) => centsValue / 100;

/** Competência AAAA-MM no fuso de Brasília (sem horário de verão desde 2019: UTC-3 fixo). */
export function competenceOf(date: Date): string {
  const shifted = new Date(date.getTime() - 3 * 60 * 60_000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Intervalo [início, fim) do mês em horário de Brasília. */
export function monthWindow(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split('-').map(Number);
  const next = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, '0')}`;
  return { start: new Date(`${month}-01T00:00:00-03:00`), end: new Date(`${next}-01T00:00:00-03:00`) };
}

export function buildLedger(input: { invoices: LedgerInvoiceInput[]; refunds: LedgerRefundInput[]; adjustments: LedgerAdjustmentInput[] }) {
  const byInvoice = new Map(input.invoices.map((invoice) => [invoice.id, invoice]));
  const entries: LedgerEntry[] = [];
  const knownRefundCents = new Map<string, number>();

  for (const invoice of input.invoices) {
    if (invoice.status !== 'PAID' || !invoice.paidAt) continue;
    entries.push({
      id: `receipt:${invoice.id}`, kind: 'RECEIPT', date: invoice.paidAt.toISOString(), competence: competenceOf(invoice.paidAt),
      invoiceId: invoice.id, companyId: invoice.companyId, provider: invoice.provider, description: invoice.description ?? 'Assinatura',
      amount: money(cents(invoice.amount)), debit: LEDGER_ACCOUNTS.BANK, credit: LEDGER_ACCOUNTS.REVENUE,
    });
  }

  const pushRefund = (id: string, invoiceId: string, amount: number, at: Date, origin: string) => {
    const invoice = byInvoice.get(invoiceId);
    if (!invoice) return;
    knownRefundCents.set(invoiceId, (knownRefundCents.get(invoiceId) ?? 0) + cents(amount));
    entries.push({
      id, kind: 'REFUND', date: at.toISOString(), competence: competenceOf(at), invoiceId, companyId: invoice.companyId, provider: invoice.provider,
      description: `Devolucao (${origin}) - ${invoice.description ?? 'Assinatura'}`, amount: money(cents(amount)),
      debit: LEDGER_ACCOUNTS.REFUNDS, credit: LEDGER_ACCOUNTS.BANK,
    });
  };
  for (const refund of input.refunds) if (refund.status === 'CONFIRMED' && refund.confirmedAt) pushRefund(`refund:${refund.id}`, refund.invoiceId, refund.amount, refund.confirmedAt, 'confirmada no provedor');
  for (const adjustment of input.adjustments) pushRefund(`adjustment:${adjustment.id}`, adjustment.invoiceId, adjustment.amount, adjustment.createdAt, 'ajuste manual');

  entries.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const issues: LedgerIssue[] = [];
  const issue = (code: LedgerIssueCode, invoice: LedgerInvoiceInput, amount: number, message: string) => issues.push({ code, invoiceId: invoice.id, companyId: invoice.companyId, amount, message });
  for (const invoice of input.invoices) {
    if (invoice.status !== 'PAID') continue;
    const refunded = cents(invoice.refundedAmount);
    const known = knownRefundCents.get(invoice.id) ?? 0;
    if (refunded > known) issue('REFUND_NOT_IN_LEDGER', invoice, money(refunded - known), 'A fatura registra devolução maior que as confirmadas no razão; conferir com o provedor.');
    const fully = refunded >= cents(invoice.amount);
    if (fully && invoice.invoiceStatus && !['CANCELED', 'PROCESSING_CANCELLATION'].includes(invoice.invoiceStatus)) issue('NFSE_NOT_CANCELED_AFTER_REFUND', invoice, invoice.amount, 'Fatura totalmente devolvida com nota fiscal ainda ativa.');
    if (!fully && refunded > 0 && invoice.invoiceStatus && !['CANCELED', 'PROCESSING_CANCELLATION'].includes(invoice.invoiceStatus)) issue('NFSE_PARTIAL_REFUND_REVIEW', invoice, money(refunded), 'Devolução parcial: a nota não aceita cancelamento parcial; ajuste manual.');
    if (!invoice.invoiceStatus && !invoice.invoiceNumber && invoice.provider !== 'MERCADOPAGO' && invoice.paidAt && Date.now() - invoice.paidAt.getTime() > 2 * 24 * 60 * 60_000) issue('NFSE_MISSING', invoice, invoice.amount, 'Fatura paga há mais de 2 dias sem nota fiscal.');
  }
  return { entries, issues };
}

export function summarizeLedger(entries: LedgerEntry[]) {
  const total = { grossReceipts: 0, refunds: 0, netRevenue: 0 };
  const byCompetence = new Map<string, { competence: string; grossReceipts: number; refunds: number; netRevenue: number }>();
  const byProvider = new Map<string, { provider: string; grossReceipts: number; refunds: number; netRevenue: number }>();
  for (const entry of entries) {
    const signed = entry.kind === 'RECEIPT' ? cents(entry.amount) : -cents(entry.amount);
    for (const [map, key] of [[byCompetence, entry.competence], [byProvider, entry.provider]] as const) {
      const row = (map as Map<string, any>).get(key) ?? { [map === byCompetence ? 'competence' : 'provider']: key, grossReceipts: 0, refunds: 0, netRevenue: 0 };
      if (entry.kind === 'RECEIPT') row.grossReceipts += cents(entry.amount); else row.refunds += cents(entry.amount);
      row.netRevenue += signed;
      (map as Map<string, any>).set(key, row);
    }
    if (entry.kind === 'RECEIPT') total.grossReceipts += cents(entry.amount); else total.refunds += cents(entry.amount);
    total.netRevenue += signed;
  }
  const fix = <T extends { grossReceipts: number; refunds: number; netRevenue: number }>(row: T): T => ({ ...row, grossReceipts: money(row.grossReceipts), refunds: money(row.refunds), netRevenue: money(row.netRevenue) });
  return {
    total: fix(total),
    byCompetence: [...byCompetence.values()].sort((a, b) => a.competence.localeCompare(b.competence)).map(fix),
    byProvider: [...byProvider.values()].sort((a, b) => a.provider.localeCompare(b.provider)).map(fix),
  };
}
