import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AsaasRejectedException } from './asaas.service';
import { PaymentRefundService } from './payment-refund.service';

/** Banco em memória: só o que PaymentRefundService usa (reserva, conciliação e liberação da reserva). */
function setup(invoice: Record<string, unknown> = {}) {
  const invoices = new Map<string, any>([['inv-1', {
    id: 'inv-1', companyId: 'co-1', amount: 100, status: 'PAID', provider: 'ASAAS', asaasPaymentId: 'pay_1', mpPaymentId: null,
    refundedAmount: 0, refundStatus: null, deletedAt: null, ...invoice,
  }]]);
  const refunds: any[] = [];
  const audit: any[] = [];
  let seq = 0;
  const matches = (row: any, where: any = {}) => Object.entries(where).every(([key, value]: [string, any]) => {
    if (value && typeof value === 'object' && 'in' in value) return value.in.includes(row[key]);
    return row[key] === value;
  });
  const tx: any = {
    $queryRaw: vi.fn(async () => []),
    platformInvoice: {
      findFirst: vi.fn(async ({ where }: any) => { const row = invoices.get(where.id); return row && !row.deletedAt ? { ...row } : null; }),
      findUnique: vi.fn(async ({ where }: any) => { const row = invoices.get(where.id); return row ? { ...row } : null; }),
      findUniqueOrThrow: vi.fn(async ({ where }: any) => ({ ...invoices.get(where.id) })),
      update: vi.fn(async ({ where, data }: any) => { Object.assign(invoices.get(where.id), data); return { ...invoices.get(where.id) }; }),
    },
    paymentRefund: {
      findUnique: vi.fn(async ({ where }: any) => refunds.find((row) => row.requestKey === where.requestKey) ?? null),
      findUniqueOrThrow: vi.fn(async ({ where }: any) => ({ ...refunds.find((row) => row.id === where.id) })),
      findMany: vi.fn(async ({ where }: any) => refunds.filter((row) => matches(row, where))),
      count: vi.fn(async ({ where }: any) => refunds.filter((row) => matches(row, where)).length),
      create: vi.fn(async ({ data }: any) => { const row = { id: `op-${(seq += 1)}`, status: 'PROCESSING', createdAt: new Date(), errorMessage: null, ...data }; refunds.push(row); return row; }),
      update: vi.fn(async ({ where, data }: any) => { const row = refunds.find((item) => item.id === where.id); Object.assign(row, data); return row; }),
      updateMany: vi.fn(async ({ where, data }: any) => { const rows = refunds.filter((row) => matches(row, where)); rows.forEach((row) => Object.assign(row, data)); return { count: rows.length }; }),
    },
    invoiceAdjustment: { aggregate: vi.fn(async () => ({ _sum: { amount: 0 } })) },
    auditLog: {
      create: vi.fn(async ({ data }: any) => { audit.push(data); return data; }),
      findFirst: vi.fn(async ({ where }: any) => audit.find((row) => row.action === where.action && row.entityId === where.entityId) ?? null),
    },
  };
  const prisma: any = { ...tx, $transaction: async (fn: any) => fn(tx) };
  const asaas: any = { isConfigured: () => true, refundPayment: vi.fn(), listRefunds: vi.fn(async () => ({ data: [] })), getCharge: vi.fn(async () => ({ refunds: [] })) };
  const mp: any = { isConfigured: () => true, refund: vi.fn(), getRefunds: vi.fn(async () => []) };
  const service = new PaymentRefundService(prisma, asaas, mp);
  return { service, invoices, refunds, audit, asaas, mp };
}

describe('Estorno com o gateway fora do ar', () => {
  it('timeout/5xx deixa a devolução pendente (UNKNOWN), com o motivo, e a fatura em PROCESSING', async () => {
    const { service, invoices, asaas } = setup();
    asaas.refundPayment.mockRejectedValue(new ServiceUnavailableException('Asaas: fora do ar'));
    const op = await service.request('inv-1', { amount: 40, reason: 'Pedido do cliente', key: 'k1' });
    expect(op.status).toBe('UNKNOWN');
    expect(op.errorMessage).toContain('fora do ar');
    expect(invoices.get('inv-1').refundStatus).toBe('PROCESSING');
  });

  it('repetir a mesma chave devolve a mesma operação e não faz novo POST (idempotente)', async () => {
    const { service, asaas } = setup();
    asaas.refundPayment.mockRejectedValue(new ServiceUnavailableException('Asaas: fora do ar'));
    const first = await service.request('inv-1', { amount: 40, reason: 'Pedido do cliente', key: 'k1' });
    const again = await service.request('inv-1', { amount: 40, reason: 'Pedido do cliente', key: 'k1' });
    expect(again.id).toBe(first.id);
    expect(asaas.refundPayment).toHaveBeenCalledTimes(1);
  });

  it('enquanto há devolução pendente, outra solicitação é barrada (saldo reservado)', async () => {
    const { service, asaas } = setup();
    asaas.refundPayment.mockRejectedValue(new ServiceUnavailableException('Asaas: fora do ar'));
    await service.request('inv-1', { amount: 40, reason: 'Pedido do cliente', key: 'k1' });
    await expect(service.request('inv-1', { amount: 40, reason: 'Outro pedido', key: 'k2' })).rejects.toMatchObject({ status: 409 });
  });

  it('pendente há mais de 10 min e ausente no provedor: vira FALHOU e libera um novo pedido', async () => {
    const { service, refunds, invoices, asaas } = setup();
    asaas.refundPayment.mockRejectedValue(new ServiceUnavailableException('Asaas: fora do ar'));
    await service.request('inv-1', { amount: 40, reason: 'Pedido do cliente', key: 'k1' });
    refunds[0].createdAt = new Date(Date.now() - 11 * 60_000);
    await service.reconcile('inv-1');
    expect(refunds[0].status).toBe('FAILED');
    expect(invoices.get('inv-1').refundStatus).toBeNull();
    asaas.refundPayment.mockResolvedValue({});
    const retry = await service.request('inv-1', { amount: 40, reason: 'Pedido do cliente', key: 'k2' });
    expect(['PENDING', 'PROCESSING']).toContain(retry.status);
  });
});

describe('Estorno: recusa definitiva do provedor', () => {
  it('recusa do Asaas (ex.: saldo insuficiente) falha na hora e devolve o saldo reservado', async () => {
    const { service, invoices, asaas, audit } = setup();
    asaas.refundPayment.mockRejectedValue(new AsaasRejectedException('Asaas recusou: saldo insuficiente'));
    const op = await service.request('inv-1', { amount: 40, reason: 'Pedido do cliente', key: 'k1' });
    expect(op.status).toBe('FAILED');
    expect(op.errorMessage).toContain('saldo insuficiente');
    expect(invoices.get('inv-1').refundStatus).toBeNull();
    expect(audit.some((row) => row.action === 'REFUND_FAILED' && row.metadata.reason === 'recusado_pelo_provedor')).toBe(true);
    asaas.refundPayment.mockResolvedValue({});
    await expect(service.request('inv-1', { amount: 40, reason: 'Nova tentativa', key: 'k2' })).resolves.toMatchObject({ status: expect.stringMatching(/PENDING|PROCESSING/) });
  });

  it('recusa depois de um estorno já confirmado volta a fatura para PARTIALLY_REFUNDED', async () => {
    const { service, invoices, asaas } = setup({ refundedAmount: 30, refundStatus: 'PARTIALLY_REFUNDED' });
    asaas.refundPayment.mockRejectedValue(new AsaasRejectedException('Asaas recusou: cobrança já estornada'));
    const op = await service.request('inv-1', { amount: 20, reason: 'Pedido do cliente', key: 'k1' });
    expect(op.status).toBe('FAILED');
    expect(invoices.get('inv-1').refundStatus).toBe('PARTIALLY_REFUNDED');
  });
});

describe('Estorno: nunca devolver mais do que foi pago', () => {
  it('pedido acima do saldo é recusado e não chama o provedor', async () => {
    const { service, asaas } = setup({ refundedAmount: 70 });
    await expect(service.request('inv-1', { amount: 40, reason: 'Pedido do cliente', key: 'k1' })).rejects.toMatchObject({ status: 400 });
    expect(asaas.refundPayment).not.toHaveBeenCalled();
  });

  it('devolução total pede exatamente o saldo restante', async () => {
    const { service, asaas } = setup({ refundedAmount: 30 });
    asaas.refundPayment.mockResolvedValue({});
    const op = await service.request('inv-1', { reason: 'Cancelamento', key: 'k1' });
    expect(Number(op.amount)).toBe(70);
    expect(op.kind).toBe('FULL');
  });

  it('se o provedor informa mais devolvido do que a fatura, a conciliação trava para revisão', async () => {
    const { service, asaas } = setup();
    asaas.listRefunds.mockResolvedValue({ data: [{ status: 'DONE', value: 80 }, { status: 'DONE', value: 40 }] });
    await expect(service.reconcile('inv-1')).rejects.toMatchObject({ status: 409 });
  });

  it('pendente há mais de 24h sem casar com o provedor gera alerta de revisão uma única vez', async () => {
    const { service, refunds, asaas, audit } = setup();
    asaas.listRefunds.mockResolvedValue({ data: [{ status: 'PENDING', value: 40 }] });
    const old = new Date(Date.now() - 25 * 60 * 60_000);
    refunds.push(
      { id: 'op-a', invoiceId: 'inv-1', requestKey: 'inv-1:a', kind: 'PARTIAL', amount: 40, status: 'UNKNOWN', provider: 'ASAAS', createdAt: old, errorMessage: 'timeout' },
      { id: 'op-b', invoiceId: 'inv-1', requestKey: 'inv-1:b', kind: 'PARTIAL', amount: 40, status: 'UNKNOWN', provider: 'ASAAS', createdAt: old, errorMessage: 'timeout' },
    );
    await service.reconcile('inv-1');
    await service.reconcile('inv-1');
    expect(audit.filter((row) => row.action === 'REFUND_NEEDS_REVIEW' && row.entityId === 'op-a')).toHaveLength(1);
  });
});
