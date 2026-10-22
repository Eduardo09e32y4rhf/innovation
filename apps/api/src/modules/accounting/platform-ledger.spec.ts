import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { buildLedger, competenceOf, LEDGER_ACCOUNTS, monthWindow, summarizeLedger, type LedgerInvoiceInput } from './platform-ledger';
import { PlatformLedgerService } from './platform-ledger.service';

const invoice = (over: Partial<LedgerInvoiceInput> & { id: string }): LedgerInvoiceInput => ({
  companyId: 'co-1', provider: 'ASAAS', description: 'Mensalidade', amount: 100, status: 'PAID', paidAt: new Date('2026-09-10T15:00:00Z'),
  refundedAmount: 0, refundStatus: null, invoiceStatus: 'AUTHORIZED', invoiceNumber: '10', ...over,
});
const refund = (id: string, invoiceId: string, amount: number, confirmedAt: string) => ({ id, invoiceId, amount, confirmedAt: new Date(confirmedAt), status: 'CONFIRMED' });

describe('Razão da receita: lançamentos de partida dobrada', () => {
  it('recebimento debita Bancos e credita Receita; devolução debita a conta redutora e credita Bancos', () => {
    const { entries } = buildLedger({
      invoices: [invoice({ id: 'a', refundedAmount: 30 })],
      refunds: [refund('r1', 'a', 30, '2026-09-20T12:00:00Z')],
      adjustments: [],
    });
    expect(entries.map((e) => [e.kind, e.amount, e.debit, e.credit])).toEqual([
      ['RECEIPT', 100, LEDGER_ACCOUNTS.BANK, LEDGER_ACCOUNTS.REVENUE],
      ['REFUND', 30, LEDGER_ACCOUNTS.REFUNDS, LEDGER_ACCOUNTS.BANK],
    ]);
  });

  it('estorno parcial reduz a receita líquida só pelo valor devolvido', () => {
    const { entries } = buildLedger({ invoices: [invoice({ id: 'a', refundedAmount: 35.5 })], refunds: [refund('r1', 'a', 35.5, '2026-09-20T12:00:00Z')], adjustments: [] });
    expect(summarizeLedger(entries).total).toEqual({ grossReceipts: 100, refunds: 35.5, netRevenue: 64.5 });
  });

  it('estorno total zera a receita da fatura (parcial + restante)', () => {
    const { entries } = buildLedger({
      invoices: [invoice({ id: 'a', refundedAmount: 100, refundStatus: 'REFUNDED', invoiceStatus: 'CANCELED' })],
      refunds: [refund('r1', 'a', 40, '2026-09-12T12:00:00Z'), refund('r2', 'a', 60, '2026-09-15T12:00:00Z')],
      adjustments: [],
    });
    expect(summarizeLedger(entries).total.netRevenue).toBe(0);
  });

  it('devolução de outro mês reduz a receita da competência em que foi confirmada', () => {
    const { entries } = buildLedger({ invoices: [invoice({ id: 'a', refundedAmount: 100 })], refunds: [refund('r1', 'a', 100, '2026-10-05T12:00:00Z')], adjustments: [] });
    const months = summarizeLedger(entries).byCompetence;
    expect(months).toEqual([
      { competence: '2026-09', grossReceipts: 100, refunds: 0, netRevenue: 100 },
      { competence: '2026-10', grossReceipts: 0, refunds: 100, netRevenue: -100 },
    ]);
  });

  it('competência segue o horário de Brasília na virada do mês', () => {
    expect(competenceOf(new Date('2026-10-01T02:59:59Z'))).toBe('2026-09');
    expect(competenceOf(new Date('2026-10-01T03:00:00Z'))).toBe('2026-10');
    const { start, end } = monthWindow('2026-12');
    expect(start.toISOString()).toBe('2026-12-01T03:00:00.000Z');
    expect(end.toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });

  it('fatura não paga não gera receita; ajuste manual legado entra como devolução', () => {
    const { entries } = buildLedger({
      invoices: [invoice({ id: 'open', status: 'OPEN', paidAt: null }), invoice({ id: 'a', refundedAmount: 10 })],
      refunds: [], adjustments: [{ id: 'adj1', invoiceId: 'a', amount: 10, createdAt: new Date('2026-09-18T12:00:00Z') }],
    });
    expect(entries.filter((e) => e.invoiceId === 'open')).toHaveLength(0);
    expect(entries.find((e) => e.id === 'adjustment:adj1')).toMatchObject({ kind: 'REFUND', amount: 10 });
  });

  it('devolução PENDENTE ou FALHOU não lança nada', () => {
    const { entries } = buildLedger({
      invoices: [invoice({ id: 'a' })],
      refunds: [{ id: 'r1', invoiceId: 'a', amount: 50, confirmedAt: null, status: 'PENDING' }, { id: 'r2', invoiceId: 'a', amount: 50, confirmedAt: new Date('2026-09-12T12:00:00Z'), status: 'FAILED' }],
      adjustments: [],
    });
    expect(entries.map((e) => e.kind)).toEqual(['RECEIPT']);
  });
});

describe('Razão da receita: contábil = aba da empresa', () => {
  const invoices = [
    invoice({ id: 'a', amount: 199.9, refundedAmount: 49.9, paidAt: new Date('2026-08-31T12:00:00Z') }),
    invoice({ id: 'b', amount: 100, refundedAmount: 100, refundStatus: 'REFUNDED', invoiceStatus: 'CANCELED', paidAt: new Date('2026-09-05T12:00:00Z') }),
    invoice({ id: 'c', amount: 59.99, companyId: 'co-2', provider: 'MERCADOPAGO', invoiceStatus: null, invoiceNumber: null, paidAt: new Date('2026-09-30T12:00:00Z') }),
  ];
  const refunds = [refund('r1', 'a', 49.9, '2026-09-03T12:00:00Z'), refund('r2', 'b', 100, '2026-10-02T12:00:00Z')];

  it('soma líquida do razão é igual a Σ (valor − devolvido) das faturas pagas, por empresa e no total', () => {
    const all = buildLedger({ invoices, refunds, adjustments: [] });
    const expected = (list: LedgerInvoiceInput[]) => Math.round(list.reduce((sum, i) => sum + (i.amount - i.refundedAmount), 0) * 100) / 100;
    expect(summarizeLedger(all.entries).total.netRevenue).toBe(expected(invoices));
    for (const companyId of ['co-1', 'co-2']) {
      const mine = buildLedger({ invoices: invoices.filter((i) => i.companyId === companyId), refunds: refunds.filter((r) => invoices.find((i) => i.id === r.invoiceId)?.companyId === companyId), adjustments: [] });
      expect(summarizeLedger(mine.entries).total.netRevenue).toBe(expected(invoices.filter((i) => i.companyId === companyId)));
    }
  });

  it('sem diferença de centavos mesmo com valores quebrados', () => {
    const { entries } = buildLedger({ invoices: [invoice({ id: 'x', amount: 0.1, refundedAmount: 0 }), invoice({ id: 'y', amount: 0.2, refundedAmount: 0 })], refunds: [], adjustments: [] });
    expect(summarizeLedger(entries).total.grossReceipts).toBe(0.3);
  });
});

describe('Razão da receita: alertas fiscais e de conciliação', () => {
  it('devolução registrada na fatura que não está no razão é sinalizada', () => {
    const { issues } = buildLedger({ invoices: [invoice({ id: 'a', refundedAmount: 40 })], refunds: [refund('r1', 'a', 25, '2026-09-12T12:00:00Z')], adjustments: [] });
    expect(issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'REFUND_NOT_IN_LEDGER', invoiceId: 'a', amount: 15 })]));
  });

  it('estorno total com nota ainda ativa alerta; com nota cancelada não', () => {
    const active = buildLedger({ invoices: [invoice({ id: 'a', refundedAmount: 100, invoiceStatus: 'AUTHORIZED' })], refunds: [refund('r1', 'a', 100, '2026-09-12T12:00:00Z')], adjustments: [] });
    expect(active.issues.map((i) => i.code)).toEqual(['NFSE_NOT_CANCELED_AFTER_REFUND']);
    const canceled = buildLedger({ invoices: [invoice({ id: 'a', refundedAmount: 100, invoiceStatus: 'CANCELED' })], refunds: [refund('r1', 'a', 100, '2026-09-12T12:00:00Z')], adjustments: [] });
    expect(canceled.issues).toEqual([]);
  });

  it('estorno parcial com nota ativa pede revisão manual (nota não aceita cancelamento parcial)', () => {
    const { issues } = buildLedger({ invoices: [invoice({ id: 'a', refundedAmount: 30 })], refunds: [refund('r1', 'a', 30, '2026-09-12T12:00:00Z')], adjustments: [] });
    expect(issues.map((i) => i.code)).toEqual(['NFSE_PARTIAL_REFUND_REVIEW']);
  });

  it('fatura do Asaas paga há mais de 2 dias sem nota alerta; Mercado Pago não exige nota automática', () => {
    const old = new Date(Date.now() - 3 * 24 * 60 * 60_000);
    const { issues } = buildLedger({
      invoices: [invoice({ id: 'a', invoiceStatus: null, invoiceNumber: null, paidAt: old }), invoice({ id: 'b', provider: 'MERCADOPAGO', invoiceStatus: null, invoiceNumber: null, paidAt: old })],
      refunds: [], adjustments: [],
    });
    expect(issues).toEqual([expect.objectContaining({ code: 'NFSE_MISSING', invoiceId: 'a' })]);
  });
});

describe('PlatformLedgerService', () => {
  function fakePrisma(rows: { invoices?: any[]; refunds?: any[] } = {}) {
    return {
      platformInvoice: { findMany: vi.fn(async ({ where }: any) => (rows.invoices ?? []).filter((row) => (!where.companyId || row.companyId === where.companyId) && (!where.id || where.id.in.includes(row.id)))) },
      paymentRefund: { findMany: vi.fn(async () => rows.refunds ?? []) },
      invoiceAdjustment: { findMany: vi.fn(async () => []) },
    } as any;
  }

  it('mês inválido é recusado', async () => {
    await expect(new PlatformLedgerService(fakePrisma()).month('2026-13')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('filtra pela empresa em todas as consultas (uma empresa não vê o razão da outra)', async () => {
    const prisma = fakePrisma({ invoices: [
      { id: 'a', companyId: 'co-1', provider: 'ASAAS', description: 'x', amount: 100, status: 'PAID', paidAt: new Date('2026-09-10T15:00:00Z'), refundedAmount: 0, refundStatus: null, invoiceStatus: 'AUTHORIZED', invoiceNumber: '1' },
      { id: 'b', companyId: 'co-2', provider: 'ASAAS', description: 'y', amount: 300, status: 'PAID', paidAt: new Date('2026-09-11T15:00:00Z'), refundedAmount: 0, refundStatus: null, invoiceStatus: 'AUTHORIZED', invoiceNumber: '2' },
    ] });
    const out = await new PlatformLedgerService(prisma).month('2026-09', 'co-1');
    expect(out.entries.map((e) => e.invoiceId)).toEqual(['a']);
    expect(out.total.netRevenue).toBe(100);
    expect(prisma.platformInvoice.findMany.mock.calls[0][0].where.companyId).toBe('co-1');
    expect(prisma.paymentRefund.findMany.mock.calls[0][0].where.invoice.companyId).toBe('co-1');
    expect(prisma.invoiceAdjustment.findMany.mock.calls[0][0].where.companyId).toBe('co-1');
  });
});
