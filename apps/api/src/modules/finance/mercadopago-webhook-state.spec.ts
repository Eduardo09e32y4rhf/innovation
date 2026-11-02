import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { matches } from './finance-test-kit';
import { MercadoPagoService } from './mercadopago.service';
import { MercadoPagoWebhookController } from './mercadopago-webhook.controller';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';
const INVOICE_ID = '22222222-2222-4222-8222-222222222222';
type Row = Record<string, any>;

/** Objeto de pagamento no formato de GET /v1/payments/{id} do Mercado Pago. */
const mpPayment = (extra: Row = {}) => ({ id: 123456789, status: 'approved', status_detail: 'accredited', transaction_amount: 100, transaction_amount_refunded: 0, external_reference: `inv:${INVOICE_ID}`, payment_type_id: 'credit_card', payment_method_id: 'visa', date_approved: '2026-10-01T10:00:00.000-03:00', ...extra });

function setup(opts: { invoice?: Row; company?: Row; others?: Row[]; payment?: Row; cycles?: number } = {}) {
  const invoice: Row = { id: INVOICE_ID, companyId: COMPANY_ID, amount: 100, status: 'OPEN', provider: 'MERCADOPAGO', mpPaymentId: '123456789', paidAt: null, deletedAt: null, billingType: 'CREDIT_CARD', ...opts.invoice };
  const company: Row = { id: COMPANY_ID, status: 'SUSPENDED', isActive: false, billingStatus: 'PAST_DUE', suspensionReason: 'inadimplencia', ...opts.company };
  const others = (opts.others ?? []).map((o, i) => ({ id: `other-${i}`, companyId: COMPANY_ID, deletedAt: null, ...o }));
  const sub: Row = { companyId: COMPANY_ID, couponCyclesLeft: opts.cycles ?? 3, couponType: 'PERCENT', couponValue: 10 };
  const companyUpdates: Row[] = [];
  const base: any = {
    platformInvoice: {
      findUnique: async ({ where }: any) => (where.mpPaymentId === invoice.mpPaymentId ? { ...invoice } : null),
      findFirst: async () => ({ ...invoice }),
      update: async ({ data }: any) => { Object.assign(invoice, data); return { ...invoice }; },
      updateMany: async ({ where, data }: any) => { if (!matches(invoice, where)) return { count: 0 }; Object.assign(invoice, data); return { count: 1 }; },
      count: async ({ where }: any) => others.filter((o) => matches(o, where)).length,
    },
    company: { findUnique: async () => ({ ...company }), update: async ({ data }: any) => { companyUpdates.push(data); Object.assign(company, data); return {}; } },
    companySubscription: {
      updateMany: async ({ where, data }: any) => {
        if (where.couponCyclesLeft?.gt !== undefined && !(sub.couponCyclesLeft > where.couponCyclesLeft.gt)) return { count: 0 };
        if (data.couponCyclesLeft?.decrement) { sub.couponCyclesLeft -= data.couponCyclesLeft.decrement; return { count: 1 }; }
        return { count: 0 };
      },
    },
    auditLog: { create: async () => ({}) },
    $transaction: async (arg: any) => (typeof arg === 'function' ? arg(base) : Promise.all(arg)),
  };
  const mp = new MercadoPagoService(new ConfigService({ MERCADOPAGO_ACCESS_TOKEN: 'x', MERCADOPAGO_WEBHOOK_SECRET: 's' }));
  vi.spyOn(mp, 'verifySignature').mockReturnValue(true);
  vi.spyOn(mp, 'getPayment').mockImplementation(async () => mpPayment(opts.payment) as any);
  const notifications: any = { notify: vi.fn(async () => undefined) };
  const refunds: any = { reconcile: vi.fn(async () => ({ refundedAmount: 0, refundStatus: null })) };
  const controller = new MercadoPagoWebhookController(base, mp, notifications, refunds);
  const send = () => controller.handle('ts=1,v1=x', 'req-1', '123456789', 'payment', { type: 'payment', action: 'payment.updated', data: { id: '123456789' } });
  return { controller, send, invoice, company, sub, companyUpdates, notifications, refunds };
}

describe('PAG-A2 (Mercado Pago): pagamento so reativa por inadimplencia sem outra fatura vencida', () => {
  it('empresa cancelada que recebe pagamento aprovado atrasado NAO e reativada', async () => {
    const t = setup({ company: { status: 'CANCELLED', billingStatus: 'CANCELED', suspensionReason: 'cancelamento_por_inadimplencia' } });
    await t.send();
    expect(t.invoice.status).toBe('PAID');
    expect(t.companyUpdates).toEqual([]);
  });

  it('duas faturas vencidas e so uma paga: empresa continua bloqueada', async () => {
    const t = setup({ others: [{ status: 'OVERDUE', dueDate: new Date('2020-01-01') }] });
    await t.send();
    expect(t.invoice.status).toBe('PAID');
    expect(t.companyUpdates).toEqual([]);
  });

  it('inadimplente com uma unica fatura vencida paga e reativada', async () => {
    const t = setup();
    await t.send();
    expect(t.companyUpdates).toEqual([{ billingStatus: 'ACTIVE', status: 'ACTIVE', isActive: true, suspensionReason: null }]);
  });
});

describe('PAG-M2: webhooks simultaneos do Mercado Pago', () => {
  it('Promise.all com duas entregas: um unico desconto de ciclo do cupom e uma unica notificacao', async () => {
    const t = setup({ cycles: 3 });
    const [a, b] = await Promise.all([t.send(), t.send()]);
    expect(t.sub.couponCyclesLeft).toBe(2);
    expect(t.notifications.notify).toHaveBeenCalledTimes(1);
    expect([a, b].filter((r: any) => r.duplicate).length).toBe(1);
  });

  it('reentrega sequencial continua idempotente', async () => {
    const t = setup({ cycles: 3 });
    await t.send();
    const second: any = await t.send();
    expect(second.duplicate).toBe(true);
    expect(t.sub.couponCyclesLeft).toBe(2);
  });
});
