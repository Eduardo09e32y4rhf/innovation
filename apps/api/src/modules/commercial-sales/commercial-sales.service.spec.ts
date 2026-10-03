import { BadRequestException } from '@nestjs/common';
import { CommissionStatus } from '@prisma/client';
import { CommercialSalesService } from './commercial-sales.service';

describe('CommercialSalesService', () => {
  it('returns the existing sale for a repeated idempotency key', async () => {
    const existing = { id: 'sale-1' };
    const prisma: any = {
      company: { findUnique: vi.fn().mockResolvedValue({ id: 'company-1', commercialOwnerId: 'seller-1' }) },
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'seller-1', role: 'COMERCIAL' }) },
      $transaction: vi.fn(async (callback: any) => callback({
        commercialSale: {
          findUnique: vi.fn().mockResolvedValue(existing),
          findUnique: vi.fn().mockResolvedValue({ ...existing, commissions: [] }),
        },
        commissionEntry: { create: vi.fn() },
      })),
    };
    const service = new CommercialSalesService(prisma);
    const result = await service.create({ sub: 'seller-1', role: 'COMERCIAL', email: 'seller@example.com' } as any, {
      companyId: 'company-1', sellerId: 'seller-1', contractValue: 1000, commissionPercentage: 5, idempotencyKey: 'same-key',
    });
    expect(result).toEqual({ id: 'sale-1', commissions: [] });
  });

  it('rejects an invalid commission transition', async () => {
    const prisma: any = { commissionEntry: { findUnique: vi.fn().mockResolvedValue({ id: 'c-1', status: CommissionStatus.PAID }) } };
    const service = new CommercialSalesService(prisma);
    await expect(service.transitionCommission({ sub: 'dev', role: 'DEV', email: 'dev@example.com' } as any, 'c-1', CommissionStatus.ELIGIBLE)).rejects.toBeInstanceOf(BadRequestException);
  });
});
