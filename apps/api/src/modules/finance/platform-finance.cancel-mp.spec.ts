import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlatformFinanceService } from './platform-finance.service';

/** Cancelar fatura do Mercado Pago: decide pelo estado REAL do pagamento lá, não por existir um id gravado. */
function setup(payment: { id: number; status: string } | null | 'not-found', invoice: Record<string, unknown> = {}) {
  const prisma = {
    platformInvoice: {
      findFirst: vi.fn().mockResolvedValue({ id: 'inv-1', companyId: 'c1', status: 'OPEN', mpPaymentId: 'mp-1', mpPreferenceId: 'pref-1', asaasPaymentId: null, deletedAt: null, ...invoice }),
      update: vi.fn().mockResolvedValue({}),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const mp = {
    isConfigured: () => true,
    findPaymentForInvoice: vi.fn().mockImplementation(async () => { if (payment === 'not-found') throw new NotFoundException(); return payment; }),
    cancelPayment: vi.fn().mockResolvedValue({}),
    expirePreference: vi.fn().mockResolvedValue({}),
  };
  const service = new PlatformFinanceService(prisma as never, {} as never, {} as never, mp as never, {} as never);
  return { service, prisma, mp };
}

describe('PlatformFinanceService.remove (Mercado Pago)', () => {
  it('pagamento recusado/cancelado não bloqueia: cancela a fatura e expira o link', async () => {
    for (const status of ['rejected', 'cancelled', 'expired']) {
      const { service, prisma, mp } = setup({ id: 1, status });
      await service.remove('inv-1');
      expect(mp.cancelPayment).not.toHaveBeenCalled();
      expect(mp.expirePreference).toHaveBeenCalledWith('pref-1');
      expect(prisma.platformInvoice.update).toHaveBeenCalledWith({ where: { id: 'inv-1' }, data: { status: 'CANCELED' } });
    }
  });

  it('pagamento pendente é cancelado no Mercado Pago antes de cancelar a fatura', async () => {
    const { service, mp, prisma } = setup({ id: 9, status: 'pending' });
    await service.remove('inv-1');
    expect(mp.cancelPayment).toHaveBeenCalledWith(9);
    expect(prisma.platformInvoice.update).toHaveBeenCalled();
  });

  it('pagamento aprovado não cancela: manda sincronizar', async () => {
    const { service, prisma } = setup({ id: 1, status: 'approved' });
    await expect(service.remove('inv-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.platformInvoice.update).not.toHaveBeenCalled();
  });

  it('id de pagamento que não existe mais no provedor não impede o cancelamento', async () => {
    const { service, prisma } = setup('not-found');
    await service.remove('inv-1');
    expect(prisma.platformInvoice.update).toHaveBeenCalled();
  });

  it('se não conseguir cancelar o pagamento pendente lá, a fatura continua aberta', async () => {
    const { service, mp, prisma } = setup({ id: 9, status: 'in_process' });
    mp.cancelPayment.mockRejectedValue(new Error('boom'));
    await expect(service.remove('inv-1')).rejects.toThrow(/não pôde ser cancelado/);
    expect(prisma.platformInvoice.update).not.toHaveBeenCalled();
  });
});
