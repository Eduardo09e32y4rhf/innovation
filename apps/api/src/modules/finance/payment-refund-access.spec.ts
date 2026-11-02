import { describe, expect, it, vi } from 'vitest';
import { PaymentRefundService } from './payment-refund.service';

type Row = Record<string, any>;

/** Banco em memoria minimo para PaymentRefundService.reconcile + regra de acesso apos estorno total. */
function setup(opts: { remoteValue: number; company?: Row; laterPaid?: boolean } = { remoteValue: 100 }) {
  const invoice: Row = { id: 'inv-1', companyId: 'co-1', amount: 100, status: 'PAID', provider: 'ASAAS', asaasPaymentId: 'pay_1', refundedAmount: 0, refundStatus: 'PROCESSING', paidAt: new Date('2026-10-01'), deletedAt: null };
  const company: Row = { id: 'co-1', status: 'ACTIVE', isActive: true, billingStatus: 'ACTIVE', suspensionReason: null, ...opts.company };
  const operation: Row = { id: 'op-1', invoiceId: 'inv-1', status: 'PENDING', amount: opts.remoteValue, createdAt: new Date(), actorId: null, requestKey: 'k', reason: 'r' };
  const companyUpdates: Row[] = [];
  const audit: Row[] = [];
  const tx: any = {
    $queryRaw: vi.fn(async () => []),
    platformInvoice: {
      findUniqueOrThrow: async () => ({ ...invoice }),
      update: async ({ data }: any) => { Object.assign(invoice, data); return { ...invoice }; },
      count: async () => (opts.laterPaid ? 1 : 0),
    },
    paymentRefund: {
      findMany: async ({ where }: any) => (where.status?.in?.includes(operation.status) ? [{ ...operation }] : []),
      count: async ({ where }: any) => (where.status?.in?.includes(operation.status) ? 1 : 0),
      update: async ({ data }: any) => { Object.assign(operation, data); return operation; },
    },
    company: { findUnique: async () => ({ ...company }), update: async ({ data }: any) => { companyUpdates.push(data); Object.assign(company, data); return {}; } },
    auditLog: { create: async ({ data }: any) => { audit.push(data); return data; }, findFirst: async () => null },
  };
  const prisma: any = { ...tx, platformInvoice: { ...tx.platformInvoice, findUnique: async () => ({ ...invoice }) }, $transaction: async (fn: any) => fn(tx) };
  // Estorno concluido (DONE) no Asaas, com a marca da operacao na descricao.
  const asaas: any = { listRefunds: async () => ({ data: [{ status: 'DONE', value: opts.remoteValue, description: 'r [Innovation:op-1]' }] }), getCharge: async () => ({ refunds: [] }) };
  const service = new PaymentRefundService(prisma, asaas, {} as any);
  return { service, invoice, company, companyUpdates, audit };
}

describe('PAG-M4: estorno total confirmado e o acesso da empresa', () => {
  it('estorno total confirmado: fatura REFUNDED e empresa suspensa pelo motivo pagamento_cancelado_ou_estornado', async () => {
    const t = setup({ remoteValue: 100 });
    await t.service.reconcile('inv-1');
    expect(t.invoice.refundStatus).toBe('REFUNDED');
    expect(t.companyUpdates).toEqual([{ billingStatus: 'PAST_DUE', status: 'SUSPENDED', isActive: false, suspensionReason: 'pagamento_cancelado_ou_estornado' }]);
    expect(t.audit.some((row) => row.action === 'COMPANY_SUSPENDED_BY_REFUND')).toBe(true);
  });

  it('a fatura estornada segue PAID: o razao contabil e o relatorio de receita dependem de status PAID + refundedAmount', async () => {
    const t = setup({ remoteValue: 100 });
    await t.service.reconcile('inv-1');
    expect(t.invoice.status).toBe('PAID');
    expect(t.invoice.refundedAmount).toBe(100);
  });

  it('estorno parcial nao bloqueia', async () => {
    const t = setup({ remoteValue: 40 });
    await t.service.reconcile('inv-1');
    expect(t.invoice.refundStatus).toBe('PARTIALLY_REFUNDED');
    expect(t.companyUpdates).toEqual([]);
  });

  it('estorno de fatura antiga (ja existe pagamento posterior vigente) nao bloqueia', async () => {
    const t = setup({ remoteValue: 100, laterPaid: true });
    await t.service.reconcile('inv-1');
    expect(t.companyUpdates).toEqual([]);
  });

  it('empresa cancelada ou ja suspensa por outro motivo nao tem o motivo sobrescrito', async () => {
    const a = setup({ remoteValue: 100, company: { status: 'CANCELLED', isActive: false, billingStatus: 'CANCELED' } });
    await a.service.reconcile('inv-1');
    expect(a.companyUpdates).toEqual([]);
    const b = setup({ remoteValue: 100, company: { status: 'SUSPENDED', isActive: false, suspensionReason: 'seguranca' } });
    await b.service.reconcile('inv-1');
    expect(b.companyUpdates).toEqual([]);
  });

  it('reconciliar de novo apos confirmado nao repete a suspensao', async () => {
    const t = setup({ remoteValue: 100 });
    await t.service.reconcile('inv-1');
    await t.service.reconcile('inv-1');
    expect(t.companyUpdates).toHaveLength(1);
  });
});
