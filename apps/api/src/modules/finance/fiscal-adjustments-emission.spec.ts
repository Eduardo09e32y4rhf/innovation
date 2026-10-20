import { describe, expect, it, vi } from 'vitest';
import { FiscalAdjustmentsService } from './fiscal-adjustments.service';

const actor = { sub: 'u1', email: 'fin@x.com', role: 'CONTABIL' } as never;

function setup(reason: string, invoiceStatus: string) {
  const manual = [{ id: 'log-1', entityId: 'inv-1', metadata: { reason }, createdAt: new Date('2026-10-01T10:00:00Z') }];
  const invoice = { id: 'inv-1', companyId: 'co-1', amount: 100, description: 'Mensalidade', asaasInvoiceId: 'nf_1', invoiceStatus, deletedAt: null, company: { id: 'co-1', name: 'Acme' } };
  const prisma: any = {
    auditLog: {
      findMany: vi.fn(async ({ where }: any) => (where.action === 'NFSE_MANUAL_ADJUSTMENT' ? manual : [])),
      create: vi.fn(async ({ data }: any) => data),
    },
    platformInvoice: {
      findMany: vi.fn(async ({ where }: any) => (where.invoiceStatus === 'CANCEL_PENDING' ? [] : [invoice])),
      findUnique: vi.fn(async () => invoice),
      update: vi.fn(async () => invoice),
    },
  };
  const fiscal: any = { ensureForInvoice: vi.fn(async () => ({ result: 'SCHEDULED', message: 'ok' })), handleRefund: vi.fn() };
  return { service: new FiscalAdjustmentsService(prisma, fiscal), fiscal, prisma };
}

describe('Fila de ajustes fiscais: emissão e cancelamento negado', () => {
  it('lista os motivos novos com texto claro para o financeiro', async () => {
    for (const reason of ['cancelamento_negado', 'emissao_recusada', 'emissao_esgotada']) {
      const { service } = setup(reason, 'ERROR');
      const [item] = await service.list();
      expect(item.reasonCode).toBe(reason);
      expect(item.reason).not.toBe(reason);
    }
  });

  it('cancelamento negado: reemitir é recusado porque a nota segue válida', async () => {
    const { service, fiscal } = setup('cancelamento_negado', 'CANCELLATION_DENIED');
    await expect(service.resolve('inv-1', 'REISSUE', undefined, actor)).rejects.toMatchObject({ status: 400 });
    expect(fiscal.ensureForInvoice).not.toHaveBeenCalled();
  });

  it('cancelamento negado: resolve só com justificativa', async () => {
    const { service, prisma } = setup('cancelamento_negado', 'CANCELLATION_DENIED');
    await expect(service.resolve('inv-1', 'MARK_RESOLVED', 'ok', actor)).rejects.toMatchObject({ status: 400 });
    await service.resolve('inv-1', 'MARK_RESOLVED', 'Prefeitura aceitou nota substituta', actor);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'NFSE_ADJUSTMENT_RESOLVED' }) }));
  });

  it('emissão esgotada: reemitir à força chama a emissão e fecha o item', async () => {
    const { service, fiscal, prisma } = setup('emissao_esgotada', 'ERROR');
    await service.resolve('inv-1', 'REISSUE', undefined, actor);
    expect(fiscal.ensureForInvoice).toHaveBeenCalledWith('inv-1', { force: true });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'NFSE_ADJUSTMENT_RESOLVED' }) }));
  });
});
