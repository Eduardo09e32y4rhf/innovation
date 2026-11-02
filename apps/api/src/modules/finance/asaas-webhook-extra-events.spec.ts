import { describe, expect, it, vi } from 'vitest';
import { AsaasWebhookProcessorService } from './asaas-webhook.processor';
import { AsaasWebhookQueueMonitorService } from './asaas-webhook-queue-monitor.service';

function build(event: string) {
  const update = vi.fn(async () => ({}));
  const invoiceUpdate = vi.fn(async () => ({}));
  const prisma: any = {
    asaasWebhookEvent: { updateMany: async () => ({ count: 1 }), findUnique: async () => ({ payload: { event, payment: { id: 'pay_1', status: 'PENDING' } } as any, eventType: event }), update },
    platformInvoice: { findUnique: async () => ({ id: 'inv-1', status: 'OPEN', companyId: 'c1' }), update: invoiceUpdate },
    company: { update: vi.fn() },
  };
  const refunds: any = { reconcile: vi.fn(async () => undefined) };
  return { processor: new AsaasWebhookProcessorService(prisma, { notify: vi.fn() } as any, { isConfigured: () => false } as any, {} as any, refunds), update, invoiceUpdate, refunds };
}

describe('PAG-07 eventos extras do Asaas', () => {
  it('PAYMENT_REFUND_DENIED reconcilia a devolucao e fica PROCESSED', async () => {
    const t = build('PAYMENT_REFUND_DENIED');
    await t.processor.processStoredEvent('e1');
    expect(t.refunds.reconcile).toHaveBeenCalledWith('inv-1');
    expect((t.update.mock.calls[0] as any)[0].data.status).toBe('PROCESSED');
  });
  it.each(['PAYMENT_REPROVED_BY_RISK_ANALYSIS', 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL', 'PAYMENT_CHARGEBACK_REVERSAL'])('%s: IGNORED, sem mudar fatura', async (ev) => {
    const t = build(ev);
    await t.processor.processStoredEvent('e1');
    expect(t.invoiceUpdate).not.toHaveBeenCalled();
    expect((t.update.mock.calls[0] as any)[0].data.status).toBe('IGNORED');
  });
});

describe('PAG-07 monitor da fila de webhook', () => {
  const now = new Date('2026-10-30T12:00:00Z');
  const mk = (oldestPending: Date | null, last: Date | null) => new AsaasWebhookQueueMonitorService({
    asaasWebhookEvent: { findFirst: async ({ where }: any) => (where ? (oldestPending ? { createdAt: oldestPending } : null) : last ? { createdAt: last } : null), count: async () => 3 },
  } as any);
  it('PENDING antigo gera alerta', async () => {
    expect(await mk(new Date('2026-10-30T10:00:00Z'), now).check(now)).toEqual(['pending_stuck']);
  });
  it('silencio longo gera alerta', async () => {
    expect(await mk(null, new Date('2026-10-28T12:00:00Z')).check(now)).toEqual(['silent']);
  });
  it('fila saudavel nao alerta', async () => {
    expect(await mk(new Date('2026-10-30T11:55:00Z'), new Date('2026-10-30T11:55:00Z')).check(now)).toEqual([]);
  });
});
