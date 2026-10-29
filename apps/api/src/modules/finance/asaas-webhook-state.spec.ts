import { describe, expect, it, vi } from 'vitest';
import { AsaasWebhookProcessorService } from './asaas-webhook.processor';
import { matches } from './finance-test-kit';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';
const FUTURE = '2099-01-10';
const PAST = '2020-01-10';

type Row = Record<string, any>;

/** Payload no formato documentado do Asaas (objeto `payment` completo, com `status` real da cobranca). */
function asaasPayload(event: string, payment: Row = {}) {
  return { id: `evt_${event}`, event, dateCreated: '2026-10-01 10:00:00', payment: { object: 'payment', id: 'pay_1', customer: 'cus_1', value: 100, netValue: 96.5, billingType: 'PIX', status: 'PENDING', dueDate: FUTURE, externalReference: 'inv:inv-1', deleted: false, ...payment } };
}

function setup(opts: { invoice: Row; company?: Row; others?: Row[]; payload: Row; remoteStatus?: string }) {
  const invoice: Row = { id: 'inv-1', companyId: COMPANY_ID, amount: 100, asaasPaymentId: 'pay_1', paidAt: null, deletedAt: null, dueDate: new Date(FUTURE), company: { id: COMPANY_ID }, ...opts.invoice };
  const company: Row = { id: COMPANY_ID, status: 'ACTIVE', isActive: true, billingStatus: 'PAST_DUE', suspensionReason: null, ...opts.company };
  const others = (opts.others ?? []).map((o, i) => ({ id: `other-${i}`, companyId: COMPANY_ID, deletedAt: null, ...o }));
  const invoiceUpdates: Row[] = [];
  const companyUpdates: Row[] = [];
  const base: any = {
    asaasWebhookEvent: { updateMany: async () => ({ count: 1 }), findUnique: async () => ({ payload: opts.payload }), update: async () => ({}) },
    platformInvoice: {
      findUnique: async ({ where }: any) => (where.asaasPaymentId === 'pay_1' || where.id === 'inv-1' ? invoice : null),
      update: async ({ data }: any) => { invoiceUpdates.push(data); Object.assign(invoice, data); return { ...invoice }; },
      create: async ({ data }: any) => ({ id: 'inv-new', ...data }),
      count: async ({ where }: any) => others.filter((o) => matches(o, where)).length,
      findMany: async () => [],
    },
    company: {
      findUnique: async () => ({ ...company }),
      findFirst: async () => ({ id: COMPANY_ID }),
      update: async ({ data }: any) => { companyUpdates.push(data); Object.assign(company, data); return {}; },
    },
    proposal: { findFirst: async () => null },
    companySubscription: { findUnique: async () => null },
    auditLog: { create: async () => ({}) },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  const notifications: any = { notify: vi.fn(async () => undefined) };
  const asaas: any = { isConfigured: () => true, getCharge: async () => ({ status: opts.remoteStatus ?? 'PENDING' }) };
  const processor = new AsaasWebhookProcessorService(base, notifications, asaas, {} as any);
  return { processor, invoice, company, invoiceUpdates, companyUpdates, notifications };
}

describe('PAG-A3: PAYMENT_UPDATED deriva o estado de payment.status, nao do nome do evento', () => {
  it('fatura vencida que recebe PAYMENT_UPDATED (status OVERDUE) continua vencida', async () => {
    const t = setup({ invoice: { status: 'OVERDUE', dueDate: new Date(PAST) }, payload: asaasPayload('PAYMENT_UPDATED', { status: 'OVERDUE', dueDate: PAST, value: 100 }) });
    await t.processor.processStoredEvent('e');
    expect(t.invoice.status).toBe('OVERDUE');
  });

  it('UPDATED atrasado com PENDING e vencimento no passado nao reabre fatura vencida', async () => {
    const t = setup({ invoice: { status: 'OVERDUE', dueDate: new Date(PAST) }, payload: asaasPayload('PAYMENT_UPDATED', { status: 'PENDING', dueDate: PAST }) });
    await t.processor.processStoredEvent('e');
    expect(t.invoice.status).toBe('OVERDUE');
  });

  it('prorrogacao real (PENDING com novo vencimento futuro) reabre a fatura vencida', async () => {
    const t = setup({ invoice: { status: 'OVERDUE', dueDate: new Date(PAST) }, payload: asaasPayload('PAYMENT_UPDATED', { status: 'PENDING', dueDate: FUTURE }) });
    await t.processor.processStoredEvent('e');
    expect(t.invoice.status).toBe('OPEN');
  });

  it('fatura paga nao volta a aberta por PAYMENT_UPDATED', async () => {
    const t = setup({ invoice: { status: 'PAID', paidAt: new Date('2026-10-01') }, payload: asaasPayload('PAYMENT_UPDATED', { status: 'PENDING' }) });
    await t.processor.processStoredEvent('e');
    expect(t.invoice.status).toBe('PAID');
    expect(t.companyUpdates).toEqual([]);
  });

  it('fatura removida (deletedAt/CANCELED) nao ressuscita com PAYMENT_UPDATED', async () => {
    const deletedAt = new Date('2026-09-01');
    const t = setup({ invoice: { status: 'CANCELED', deletedAt }, payload: asaasPayload('PAYMENT_UPDATED', { status: 'PENDING' }) });
    await t.processor.processStoredEvent('e');
    expect(t.invoice.status).toBe('CANCELED');
    expect(t.invoice.deletedAt).toEqual(deletedAt);
  });

  it('PAYMENT_UPDATED so de valor/vencimento em fatura aberta atualiza os campos e mantem aberta', async () => {
    const t = setup({ invoice: { status: 'OPEN', amount: 100 }, payload: asaasPayload('PAYMENT_UPDATED', { status: 'PENDING', dueDate: '2099-02-01', value: 100 }) });
    await t.processor.processStoredEvent('e');
    expect(t.invoice.status).toBe('OPEN');
    expect(t.invoice.dueDate).toEqual(new Date('2099-02-01'));
  });

  it('PAYMENT_RESTORED de cobranca removida a restaura (unico caso que limpa deletedAt)', async () => {
    const t = setup({ invoice: { status: 'CANCELED', deletedAt: new Date('2026-09-01') }, payload: asaasPayload('PAYMENT_RESTORED', { status: 'PENDING' }) });
    await t.processor.processStoredEvent('e');
    expect(t.invoice.status).toBe('OPEN');
    expect(t.invoice.deletedAt).toBeNull();
  });

  it('PAYMENT_UPDATED sem payment.status preserva o estado local', async () => {
    const t = setup({ invoice: { status: 'OVERDUE', dueDate: new Date(PAST) }, payload: asaasPayload('PAYMENT_UPDATED', { status: undefined, dueDate: PAST }) });
    await t.processor.processStoredEvent('e');
    expect(t.invoice.status).toBe('OVERDUE');
  });
});

describe('PAG-A2: pagamento so reativa quando o bloqueio e por inadimplencia e nao resta fatura vencida', () => {
  const received = (extra: Row = {}) => asaasPayload('PAYMENT_RECEIVED', { status: 'RECEIVED', ...extra });

  it('empresa CANCELADA que recebe pagamento atrasado NAO e reativada (a fatura fica paga)', async () => {
    const t = setup({ invoice: { status: 'OVERDUE' }, company: { billingStatus: 'CANCELED', status: 'CANCELLED', isActive: false, suspensionReason: 'cancelamento_por_inadimplencia' }, payload: received() });
    await t.processor.processStoredEvent('e');
    expect(t.invoice.status).toBe('PAID');
    expect(t.companyUpdates).toEqual([]);
  });

  it('empresa suspensa por motivo de seguranca/manual NAO e reativada', async () => {
    const t = setup({ invoice: { status: 'OVERDUE' }, company: { status: 'SUSPENDED', isActive: false, suspensionReason: 'seguranca' }, payload: received() });
    await t.processor.processStoredEvent('e');
    expect(t.companyUpdates).toEqual([]);
  });

  it('duas faturas vencidas e so uma paga: continua inadimplente (sem reativar)', async () => {
    const t = setup({ invoice: { status: 'OVERDUE' }, company: { status: 'SUSPENDED', isActive: false, billingStatus: 'PAST_DUE', suspensionReason: 'inadimplencia' }, others: [{ status: 'OVERDUE', dueDate: new Date(PAST) }], payload: received() });
    await t.processor.processStoredEvent('e');
    expect(t.invoice.status).toBe('PAID');
    expect(t.companyUpdates).toEqual([]);
  });

  it('fatura aberta ja vencida (OPEN com dueDate passado) tambem impede a reativacao', async () => {
    const t = setup({ invoice: { status: 'OVERDUE' }, company: { status: 'SUSPENDED', isActive: false, suspensionReason: 'inadimplencia' }, others: [{ status: 'OPEN', dueDate: new Date(PAST) }], payload: received() });
    await t.processor.processStoredEvent('e');
    expect(t.companyUpdates).toEqual([]);
  });

  it('inadimplencia sem outra fatura pendente reativa', async () => {
    const t = setup({ invoice: { status: 'OVERDUE' }, company: { status: 'SUSPENDED', isActive: false, suspensionReason: 'inadimplencia' }, others: [{ status: 'OPEN', dueDate: new Date(FUTURE) }, { status: 'PAID', dueDate: new Date(PAST) }], payload: received() });
    await t.processor.processStoredEvent('e');
    expect(t.companyUpdates).toEqual([{ billingStatus: 'ACTIVE', status: 'ACTIVE', isActive: true, suspensionReason: null }]);
  });

  it('primeiro pagamento (aguardando_primeiro_pagamento) reativa', async () => {
    const t = setup({ invoice: { status: 'OPEN' }, company: { status: 'SUSPENDED', isActive: false, billingStatus: 'PENDING_PAYMENT', suspensionReason: 'aguardando_primeiro_pagamento' }, payload: received() });
    await t.processor.processStoredEvent('e');
    expect(t.companyUpdates).toHaveLength(1);
    expect(t.companyUpdates[0]).toMatchObject({ status: 'ACTIVE', isActive: true });
  });
});
