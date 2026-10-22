import { describe, expect, it, vi } from 'vitest';
import { AsaasFiscalService } from './asaas-fiscal.service';

function setup(invoiceStatus: string | null, cancel = vi.fn(async () => ({ id: 'nf_1', status: 'PROCESSING_CANCELLATION' }))) {
  const prisma: any = {
    platformInvoice: {
      findUnique: vi.fn(async () => ({ id: 'inv', companyId: 'c', asaasInvoiceId: 'nf_1', invoiceStatus })),
      update: vi.fn(async () => ({})),
    },
    auditLog: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({})) },
  };
  const asaas: any = { cancelFiscalInvoice: cancel };
  const svc = new AsaasFiscalService(prisma, asaas, { get: () => '' } as any);
  return { svc, prisma, cancel };
}

describe('AsaasFiscalService.handleRefund', () => {
  it('estorno total cancela NF autorizada', async () => {
    const { svc, cancel, prisma } = setup('AUTHORIZED');
    expect((await svc.handleRefund('inv', 'REFUNDED')).result).toBe('REQUESTED');
    expect(cancel).toHaveBeenCalledWith('nf_1');
    expect(prisma.platformInvoice.update.mock.calls[0][0].data.invoiceStatus).toBe('PROCESSING_CANCELLATION');
  });

  it('idempotente: nota já cancelada ou em cancelamento não chama o Asaas', async () => {
    for (const status of ['CANCELED', 'PROCESSING_CANCELLATION']) {
      const { svc, cancel } = setup(status);
      expect((await svc.handleRefund('inv', 'REFUNDED')).result).toBe('SKIPPED');
      expect(cancel).not.toHaveBeenCalled();
    }
  });

  it('falha no Asaas vira CANCEL_PENDING sem lançar', async () => {
    const { svc, prisma } = setup('AUTHORIZED', vi.fn(async () => { throw new Error('prefeitura fora'); }));
    expect((await svc.handleRefund('inv', 'REFUNDED')).result).toBe('FAILED');
    expect(prisma.platformInvoice.update.mock.calls[0][0].data.invoiceStatus).toBe('CANCEL_PENDING');
  });

  it('estorno parcial e chargeback não cancelam: registram revisão manual', async () => {
    for (const status of ['PARTIALLY_REFUNDED', 'CHARGEBACK'] as const) {
      const { svc, cancel, prisma } = setup('AUTHORIZED');
      expect((await svc.handleRefund('inv', status)).result).toBe('MANUAL');
      expect(cancel).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    }
  });
});
