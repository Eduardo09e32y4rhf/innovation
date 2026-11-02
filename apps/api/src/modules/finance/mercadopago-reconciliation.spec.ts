import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import { matches } from './finance-test-kit';
import { MercadoPagoPaymentSyncService } from './mercadopago-payment-sync.service';
import { MercadoPagoService } from './mercadopago.service';
import { PaymentReconciliationService } from './payment-reconciliation.service';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';
type Row = Record<string, any>;

function setup(opts: { payment?: Row | null; invoice?: Row } = {}) {
  const invoice: Row = { id: 'inv-mp', companyId: COMPANY_ID, amount: 100, status: 'OVERDUE', provider: 'MERCADOPAGO', mpPaymentId: null, asaasPaymentId: null, paymentProcessingStatus: 'LINK_READY', paidAt: null, deletedAt: null, billingType: 'PIX', createdAt: new Date(), updatedAt: new Date(), ...opts.invoice };
  const asaasFindMany = vi.fn(async () => []);
  const companyUpdates: Row[] = [];
  const base: any = {
    platformInvoice: {
      findMany: async ({ where }: any) => (where.provider === 'MERCADOPAGO' ? [invoice].filter((i) => matches(i, { deletedAt: where.deletedAt, provider: where.provider, status: where.status })) : asaasFindMany()),
      updateMany: async ({ where, data }: any) => { if (!matches(invoice, where)) return { count: 0 }; Object.assign(invoice, data); return { count: 1 }; },
      count: async () => 0,
    },
    company: { findUnique: async () => ({ billingStatus: 'PAST_DUE', status: 'SUSPENDED', isActive: false, suspensionReason: 'inadimplencia' }), update: async ({ data }: any) => { companyUpdates.push(data); return {}; } },
    companySubscription: { updateMany: async () => ({ count: 0 }) },
    auditLog: { create: async () => ({}), findMany: async () => [] },
    asaasWebhookEvent: {},
    $transaction: async (arg: any) => (typeof arg === 'function' ? arg(base) : Promise.all(arg)),
  };
  const mp = new MercadoPagoService(new ConfigService({ MERCADOPAGO_ACCESS_TOKEN: 'x' }));
  const find = vi.spyOn(mp, 'findPaymentForInvoice').mockResolvedValue((opts.payment === undefined ? { id: 99, status: 'approved', transaction_amount: 100, payment_type_id: 'bank_transfer', date_approved: '2026-10-01T10:00:00.000-03:00' } : opts.payment) as any);
  const notifications: any = { notify: vi.fn(async () => undefined) };
  const sync = new MercadoPagoPaymentSyncService(base, mp, notifications);
  const asaas: any = { isConfigured: () => false };
  const service = new PaymentReconciliationService(base, asaas, {} as any, {} as any, undefined, mp, sync);
  return { service, invoice, find, notifications, companyUpdates };
}

describe('PAG-A1: conciliacao periodica inclui o Mercado Pago', () => {
  it('webhook perdido/atrasado: fatura MP vencida com pagamento aprovado no gateway e baixada pela conciliacao', async () => {
    const t = setup();
    const report = await t.service.reconcile();
    expect(t.find).toHaveBeenCalledWith('inv-mp', null);
    expect(t.invoice.status).toBe('PAID');
    expect(t.invoice.mpPaymentId).toBe('99');
    expect(t.notifications.notify).toHaveBeenCalledTimes(1);
    expect(t.companyUpdates).toHaveLength(1); // mesmas regras de reativacao do webhook
    expect(report.healed).toBe(1);
  });

  it('sem pagamento aprovado no gateway a fatura nao muda', async () => {
    const t = setup({ payment: { id: 5, status: 'pending', transaction_amount: 100 } });
    await t.service.reconcile();
    expect(t.invoice.status).toBe('OVERDUE');
    expect(t.notifications.notify).not.toHaveBeenCalled();
  });

  it('nenhum pagamento encontrado: nada muda e nao ha erro', async () => {
    const t = setup({ payment: null });
    const report = await t.service.reconcile();
    expect(t.invoice.status).toBe('OVERDUE');
    expect(report.errors).toBe(0);
  });

  it('rodar duas vezes (ou webhook + conciliacao juntos) nao duplica aviso nem cupom', async () => {
    const t = setup();
    await Promise.all([t.service.reconcile(), t.service.reconcile()]);
    expect(t.notifications.notify).toHaveBeenCalledTimes(1);
  });
});

describe('PAG-A1: janela do ts do x-signature do Mercado Pago (mantida em 5 min; a conciliacao recupera o atrasado)', () => {
  const SECRET = 'mp-secret-for-tests';
  const make = (extra: Row = {}) => new MercadoPagoService(new ConfigService({ MERCADOPAGO_WEBHOOK_SECRET: SECRET, ...extra }));
  const signed = (ts: number) => ({ dataId: 'P1', requestId: 'r1', signature: `ts=${ts},v1=${crypto.createHmac('sha256', SECRET).update(`id:p1;request-id:r1;ts:${ts};`).digest('hex')}` });

  it('webhook com 20 min de atraso e rejeitado por padrao (nada e gravado); a conciliacao acima baixa o pagamento', () => {
    const s = signed(Date.now() - 20 * 60_000);
    expect(make().verifySignature({ signature: s.signature, requestId: s.requestId, dataId: s.dataId })).toBe(false);
  });
  it('a tolerancia e configuravel por MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS', () => {
    const s = signed(Date.now() - 20 * 60_000);
    expect(make({ MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS: '3600' }).verifySignature({ signature: s.signature, requestId: s.requestId, dataId: s.dataId })).toBe(true);
  });
  it('HMAC adulterado e rejeitado mesmo com ts atual', () => {
    const s = signed(Date.now());
    // A assinatura muda a cada execucao (depende do ts): trocar o ultimo caractere por '0' falhava 1 vez em 16
    // (quando ele ja era '0' a assinatura ficava intacta). Aqui o caractere SEMPRE muda.
    const tampered = s.signature.replace(/.$/, (last) => (last === '0' ? '1' : '0'));
    expect(tampered).not.toBe(s.signature);
    expect(make().verifySignature({ signature: tampered, requestId: s.requestId, dataId: s.dataId })).toBe(false);
  });
});
