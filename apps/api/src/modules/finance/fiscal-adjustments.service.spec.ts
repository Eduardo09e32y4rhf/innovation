import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { FiscalAdjustmentsService } from './fiscal-adjustments.service';

const COMPANY = { id: 'c1', name: 'Acme' };
const actor: any = { sub: 'u1', email: 'dev@x.com' };
const at = (iso: string) => new Date(iso);

function setup(opts: { manual?: any[]; resolved?: any[]; pending?: any[]; invoice?: any; handleRefund?: any; ensure?: any } = {}) {
  const invoices: Record<string, any> = {
    inv1: { id: 'inv1', companyId: 'c1', amount: 100, description: 'Mensalidade', asaasInvoiceId: 'nf1', invoiceStatus: 'AUTHORIZED', deletedAt: null, company: COMPANY, updatedAt: at('2026-02-01') },
    ...(opts.invoice ? { inv1: { ...opts.invoice, id: 'inv1', companyId: 'c1', company: COMPANY, updatedAt: at('2026-02-01') } } : {}),
  };
  const created: any[] = [];
  const prisma: any = {
    auditLog: {
      findMany: vi.fn(async ({ where }: any) => (where.action === 'NFSE_MANUAL_ADJUSTMENT' ? opts.manual ?? [] : opts.resolved ?? [])),
      create: vi.fn(async ({ data }: any) => { created.push(data); return data; }),
    },
    platformInvoice: {
      findMany: vi.fn(async ({ where }: any) => (where.invoiceStatus ? opts.pending ?? [] : Object.values(invoices).filter((row: any) => where.id.in.includes(row.id)))),
      findUnique: vi.fn(async ({ where }: any) => invoices[where.id] ?? null),
      update: vi.fn(async () => ({})),
    },
  };
  const fiscal: any = { handleRefund: opts.handleRefund ?? vi.fn(async () => ({ result: 'REQUESTED' })), ensureForInvoice: opts.ensure ?? vi.fn(async () => ({ result: 'SCHEDULED', message: 'ok' })) };
  return { service: new FiscalAdjustmentsService(prisma, fiscal), prisma, fiscal, created };
}

const manualRow = (reason = 'chargeback', createdAt = '2026-02-02') => ({ id: `log-${reason}`, entityId: 'inv1', metadata: { reason }, createdAt: at(createdAt) });

describe('FiscalAdjustmentsService.list', () => {
  it('lista revisão manual e cancelamento pendente, mais recentes primeiro', async () => {
    const { service } = setup({ manual: [manualRow('estorno_parcial', '2026-02-05')], pending: [{ id: 'inv1', updatedAt: at('2026-02-10') }] });
    const items = await service.list();
    expect(items.map((item) => item.kind)).toEqual(['CANCEL_PENDING', 'MANUAL_REVIEW']);
    expect(items[1].reason).toMatch(/Estorno parcial/);
    expect(items[0].company?.name).toBe('Acme');
  });

  it('ajuste já resolvido depois do registro some da fila', async () => {
    const { service } = setup({ manual: [manualRow()], resolved: [{ entityId: 'inv1', metadata: { reason: 'chargeback' }, createdAt: at('2026-02-03') }] });
    expect(await service.list()).toHaveLength(0);
  });

  it('novo chargeback depois de uma resolução antiga volta para a fila', async () => {
    const { service } = setup({ manual: [manualRow('chargeback', '2026-03-01')], resolved: [{ entityId: 'inv1', metadata: { reason: 'chargeback' }, createdAt: at('2026-02-03') }] });
    expect(await service.list()).toHaveLength(1);
  });
});

describe('FiscalAdjustmentsService.resolve', () => {
  it('RETRY_CANCEL chama o serviço fiscal e propaga falha do provedor como 409', async () => {
    const ok = setup({ pending: [{ id: 'inv1', updatedAt: at('2026-02-10') }] });
    expect((await ok.service.resolve('inv1', 'RETRY_CANCEL', undefined, actor)).outcome).toBe('REQUESTED');
    expect(ok.fiscal.handleRefund).toHaveBeenCalledWith('inv1', 'REFUNDED');
    const fail = setup({ pending: [{ id: 'inv1', updatedAt: at('2026-02-10') }], handleRefund: vi.fn(async () => ({ result: 'FAILED' })) });
    await expect(fail.service.resolve('inv1', 'RETRY_CANCEL', undefined, actor)).rejects.toThrow(ConflictException);
  });

  it('MARK_RESOLVED exige justificativa e grava auditoria com o usuário', async () => {
    const { service, created } = setup({ manual: [manualRow()] });
    await expect(service.resolve('inv1', 'MARK_RESOLVED', 'ok', actor)).rejects.toThrow(BadRequestException);
    await service.resolve('inv1', 'MARK_RESOLVED', 'Nota substituta emitida no painel', actor);
    expect(created[0]).toMatchObject({ action: 'NFSE_ADJUSTMENT_RESOLVED', userId: 'u1', entityId: 'inv1' });
    expect(created[0].metadata).toMatchObject({ reason: 'chargeback', note: 'Nota substituta emitida no painel' });
  });

  it('REISSUE só com a nota anterior cancelada e nunca em estorno parcial', async () => {
    const authorized = setup({ manual: [manualRow('chargeback')] });
    await expect(authorized.service.resolve('inv1', 'REISSUE', undefined, actor)).rejects.toThrow(ConflictException);
    const partial = setup({ manual: [manualRow('estorno_parcial')], invoice: { amount: 100, asaasInvoiceId: 'nf1', invoiceStatus: 'CANCELED', deletedAt: null } });
    await expect(partial.service.resolve('inv1', 'REISSUE', undefined, actor)).rejects.toThrow(BadRequestException);
    const canceled = setup({ manual: [manualRow('chargeback')], invoice: { amount: 100, asaasInvoiceId: 'nf1', invoiceStatus: 'CANCELED', deletedAt: null } });
    expect((await canceled.service.resolve('inv1', 'REISSUE', undefined, actor)).outcome).toBe('SCHEDULED');
    expect(canceled.fiscal.ensureForInvoice).toHaveBeenCalledWith('inv1', { force: true });
  });

  it('fatura sem ajuste pendente é recusada', async () => {
    const { service } = setup();
    await expect(service.resolve('inv1', 'MARK_RESOLVED', 'nada a fazer aqui', actor)).rejects.toThrow(ConflictException);
  });
});
