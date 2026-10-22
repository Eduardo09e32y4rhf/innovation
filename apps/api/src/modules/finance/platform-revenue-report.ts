/**
 * Relatório contábil mensal da receita da própria plataforma (Innovation).
 * Cálculo puro (sem banco): o serviço busca os dados e entrega aqui. Valores em centavos por dentro, reais na saída.
 * Os totais de recebimento e devolução vêm do razão (platform-ledger), então o fechamento bate por construção.
 */
import type { LedgerEntry } from '../accounting/platform-ledger';

export const NO_PLAN = 'SEM_PLANO';
export const TAX_ESTIMATE_WARNING = 'Estimativa: imposto calculado pela alíquota configurada (PLATFORM_TAX_RATE_PERCENT) sobre a receita recebida menos devoluções; não substitui a apuração fiscal.';

const cents = (value: number) => Math.round(value * 100);
const reais = (value: number) => value / 100;

export function taxRatePercent(raw: string | undefined = process.env.PLATFORM_TAX_RATE_PERCENT): number {
  if (raw === undefined || raw.trim() === '') return 6;
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 6;
}

const CYCLE_MONTHS: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, SEMIANNUALLY: 6, YEARLY: 12 };
/** Meses que a cobrança do plano cobre (ciclo); CUSTOM usa o compromisso em meses. */
export function cycleMonths(plan: { cycle?: string | null; commitmentMonths?: number | null } | undefined): number {
  if (!plan) return 1;
  const fixed = plan.cycle ? CYCLE_MONTHS[plan.cycle] : undefined;
  if (fixed) return fixed;
  return plan.commitmentMonths && plan.commitmentMonths > 0 ? plan.commitmentMonths : 1;
}

export interface ReportInvoice { id: string; companyId: string; planId: string | null; amount: number; refundedAmount: number; paidAt: Date | null; gatewayNetValue: number | null; provider: string }
export interface ReportPlan { id: string; name: string; cycle?: string | null; commitmentMonths?: number | null }
export interface CancellationInput { companyId: string; at: Date }

export interface PlanRow {
  planId: string; planName: string;
  grossReceipts: number; refunds: number; gatewayFees: number; estimatedTaxes: number; netRevenue: number;
  mrr: number; activeCustomers: number; newCustomers: number; canceledCustomers: number;
}

export interface BuildInput {
  month: string;
  start: Date;
  end: Date;
  entries: LedgerEntry[];
  /** Faturas citadas pelos lançamentos do mês (recebimentos e devoluções). */
  entryInvoices: ReportInvoice[];
  /** Todas as faturas pagas até o fim do mês (base de clientes e MRR). */
  paidUntilEnd: ReportInvoice[];
  cancellations: CancellationInput[];
  plans: ReportPlan[];
  taxRate?: number;
}

const emptyRow = (planId: string, planName: string): Record<keyof PlanRow, any> & PlanRow => ({
  planId, planName, grossReceipts: 0, refunds: 0, gatewayFees: 0, estimatedTaxes: 0, netRevenue: 0, mrr: 0, activeCustomers: 0, newCustomers: 0, canceledCustomers: 0,
}) as any;

export function buildMonthlyReport(input: BuildInput) {
  const rate = input.taxRate ?? taxRatePercent();
  const planById = new Map(input.plans.map((plan) => [plan.id, plan]));
  const invoiceById = new Map(input.entryInvoices.map((invoice) => [invoice.id, invoice]));
  const rows = new Map<string, { row: PlanRow; c: { gross: number; refunds: number; fees: number; mrr: number } }>();
  const rowFor = (planId: string | null) => {
    const key = planId ?? NO_PLAN;
    let hit = rows.get(key);
    if (!hit) {
      hit = { row: emptyRow(key, key === NO_PLAN ? 'Sem plano' : planById.get(key)?.name ?? 'Plano removido'), c: { gross: 0, refunds: 0, fees: 0, mrr: 0 } };
      rows.set(key, hit);
    }
    return hit;
  };

  let missingNetValue = 0;
  for (const entry of input.entries) {
    const invoice = invoiceById.get(entry.invoiceId);
    const bucket = rowFor(invoice?.planId ?? null);
    if (entry.kind === 'REFUND') { bucket.c.refunds += cents(entry.amount); continue; }
    bucket.c.gross += cents(entry.amount);
    if (invoice && invoice.gatewayNetValue !== null && Number.isFinite(invoice.gatewayNetValue)) bucket.c.fees += Math.max(0, cents(entry.amount) - cents(invoice.gatewayNetValue));
    else missingNetValue += 1;
  }

  // Clientes: primeira fatura paga, cancelamentos e carteira ativa no fim do mês.
  const firstPaid = new Map<string, Date>();
  const lastPaid = new Map<string, ReportInvoice>();
  const planOfCompany = new Map<string, string | null>();
  for (const invoice of [...input.paidUntilEnd].sort((a, b) => (a.paidAt?.getTime() ?? 0) - (b.paidAt?.getTime() ?? 0))) {
    if (!invoice.paidAt || cents(invoice.amount) <= 0) continue;
    if (!firstPaid.has(invoice.companyId)) firstPaid.set(invoice.companyId, invoice.paidAt);
    lastPaid.set(invoice.companyId, invoice);
    planOfCompany.set(invoice.companyId, invoice.planId);
  }
  const canceledBefore = new Set<string>();
  const canceledInMonth = new Set<string>();
  for (const cancellation of input.cancellations) {
    const first = firstPaid.get(cancellation.companyId);
    if (!first || first > cancellation.at) continue; // quem nunca pagou (teste recusado) não é churn
    if (cancellation.at < input.start) canceledBefore.add(cancellation.companyId);
    else if (cancellation.at < input.end) canceledInMonth.add(cancellation.companyId);
  }
  // Quem pagou depois do último cancelamento voltou: não conta como cancelado antes.
  for (const companyId of [...canceledBefore]) {
    const paid = lastPaid.get(companyId)?.paidAt;
    const lastCancel = Math.max(...input.cancellations.filter((c) => c.companyId === companyId && c.at < input.start).map((c) => c.at.getTime()));
    if (paid && paid.getTime() > lastCancel) canceledBefore.delete(companyId);
  }

  let startBase = 0;
  let newCustomers = 0;
  for (const [companyId, first] of firstPaid) {
    const planKey = planOfCompany.get(companyId) ?? null;
    if (first >= input.start && first < input.end) { newCustomers += 1; rowFor(planKey).row.newCustomers += 1; }
    if (first < input.start && !canceledBefore.has(companyId)) startBase += 1;
  }
  for (const companyId of canceledInMonth) rowFor(planOfCompany.get(companyId) ?? null).row.canceledCustomers += 1;

  // MRR: cada cliente ativo conta o valor líquido de devoluções da última cobrança paga, normalizado pelos meses do ciclo.
  let activeCustomers = 0;
  for (const [companyId, invoice] of lastPaid) {
    if (canceledBefore.has(companyId) || canceledInMonth.has(companyId)) continue;
    const months = cycleMonths(invoice.planId ? planById.get(invoice.planId) : undefined);
    const covered = new Date(invoice.paidAt as Date);
    covered.setUTCMonth(covered.getUTCMonth() + months);
    if (covered <= input.start) continue; // ciclo pago já terminou antes do mês: sem renovação, fora do MRR
    const net = Math.max(0, cents(invoice.amount) - cents(invoice.refundedAmount));
    if (net === 0) continue;
    const bucket = rowFor(invoice.planId);
    bucket.c.mrr += Math.round(net / months);
    bucket.row.activeCustomers += 1;
    activeCustomers += 1;
  }

  const planRows: PlanRow[] = [];
  const total = { gross: 0, refunds: 0, fees: 0, taxes: 0, net: 0, mrr: 0 };
  for (const { row, c } of rows.values()) {
    const taxes = Math.max(0, Math.round(((c.gross - c.refunds) * rate) / 100));
    const net = c.gross - c.refunds - c.fees - taxes;
    Object.assign(row, { grossReceipts: reais(c.gross), refunds: reais(c.refunds), gatewayFees: reais(c.fees), estimatedTaxes: reais(taxes), netRevenue: reais(net), mrr: reais(c.mrr) });
    total.gross += c.gross; total.refunds += c.refunds; total.fees += c.fees; total.taxes += taxes; total.net += net; total.mrr += c.mrr;
    planRows.push(row);
  }
  planRows.sort((a, b) => b.grossReceipts - a.grossReceipts || a.planName.localeCompare(b.planName));

  const canceled = canceledInMonth.size;
  return {
    month: input.month,
    timezone: 'America/Sao_Paulo',
    totals: {
      grossReceipts: reais(total.gross), refunds: reais(total.refunds), gatewayFees: reais(total.fees),
      estimatedTaxes: reais(total.taxes), netRevenue: reais(total.net),
      mrr: reais(total.mrr), activeCustomers, newCustomers, canceledCustomers: canceled,
      churnRatePercent: startBase > 0 ? Math.round((canceled / startBase) * 10000) / 100 : null,
      customersAtStart: startBase,
    },
    tax: { ratePercent: rate, estimate: true, warning: TAX_ESTIMATE_WARNING },
    gateway: { receiptsWithoutNetValue: missingNetValue, complete: missingNetValue === 0 },
    byPlan: planRows,
  };
}

export type MonthlyReport = ReturnType<typeof buildMonthlyReport>;

const csvNumber = (value: number) => value.toFixed(2).replace('.', ',');
const csvText = (value: string) => {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** CSV do relatório: separador ';', vírgula decimal, UTF-8 com BOM (abre direto no Excel em português). */
export function reportToCsv(report: MonthlyReport): string {
  const t = report.totals;
  const lines: string[] = [
    ['Relatorio mensal da receita da plataforma', report.month].map(csvText).join(';'),
    ['Fuso', report.timezone].map(csvText).join(';'),
    ['Aviso', report.tax.warning].map(csvText).join(';'),
    '',
    'Indicador;Valor',
    ['Receita bruta recebida', csvNumber(t.grossReceipts)].join(';'),
    ['Devolucoes', csvNumber(t.refunds)].join(';'),
    ['Taxas do gateway', csvNumber(t.gatewayFees)].join(';'),
    [`Impostos estimados (${csvNumber(report.tax.ratePercent)}%)`, csvNumber(t.estimatedTaxes)].join(';'),
    ['Receita liquida', csvNumber(t.netRevenue)].join(';'),
    ['MRR', csvNumber(t.mrr)].join(';'),
    ['Clientes ativos', String(t.activeCustomers)].join(';'),
    ['Clientes novos', String(t.newCustomers)].join(';'),
    ['Clientes cancelados', String(t.canceledCustomers)].join(';'),
    ['Churn (%)', t.churnRatePercent === null ? '' : csvNumber(t.churnRatePercent)].join(';'),
    '',
    'Plano;Receita bruta;Devolucoes;Taxas do gateway;Impostos estimados;Receita liquida;MRR;Clientes ativos;Clientes novos;Clientes cancelados',
    ...report.byPlan.map((r) => [csvText(r.planName), csvNumber(r.grossReceipts), csvNumber(r.refunds), csvNumber(r.gatewayFees), csvNumber(r.estimatedTaxes), csvNumber(r.netRevenue), csvNumber(r.mrr), r.activeCustomers, r.newCustomers, r.canceledCustomers].join(';')),
  ];
  return `﻿${lines.join('\r\n')}\r\n`;
}
