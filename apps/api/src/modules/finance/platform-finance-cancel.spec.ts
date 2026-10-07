import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PlatformFinanceService } from './platform-finance.service';

function setup(configured = true) {
  const prisma = {
    companySubscription: { findUnique: vi.fn().mockResolvedValue({ mpPreapprovalId: 'subscription' }), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  const mp = { isConfigured: () => configured, cancelSubscription: vi.fn() };
  const service = new PlatformFinanceService(prisma as never, {} as never, {} as never, mp as never, {} as never);
  return { service, prisma, mp };
}

describe('Cancelamento da recorrência Mercado Pago', () => {
  it('preserva vínculo e interrompe a operação quando o provedor falha', async () => {
    const { service, prisma, mp } = setup();
    mp.cancelSubscription.mockRejectedValue(new Error('timeout'));
    await expect(service.cancelMercadoPagoSubscription('company')).rejects.toMatchObject({ status: 503 });
    expect(prisma.companySubscription.updateMany).not.toHaveBeenCalled();
  });
  it('não confirma cancelamento de assinatura vinculada sem integração configurada', async () => {
    const { service, prisma } = setup(false);
    await expect(service.cancelMercadoPagoSubscription('company')).rejects.toMatchObject({ status: 503 });
    expect(prisma.companySubscription.updateMany).not.toHaveBeenCalled();
  });
  it('permite repetir cancelamento quando o provedor confirma que não existe assinatura', async () => {
    const { service, prisma, mp } = setup();
    mp.cancelSubscription.mockRejectedValue(new NotFoundException());
    await service.cancelMercadoPagoSubscription('company');
    expect(prisma.companySubscription.updateMany).toHaveBeenCalledWith({ where: { companyId: 'company' }, data: { mpPreapprovalId: null } });
  });
});
