import { describe, expect, it, vi } from 'vitest';
import { ManualContractsRepository } from './manual-contracts.repository';

describe('ManualContractsRepository audit trail', () => {
  it('updates status with compare-and-set and stores before/after transition metadata', async () => {
    const contract = {
      id: 'contract-1',
      companyId: 'company-1',
      planId: 'plan-1',
      seatQuantity: 10,
      agreedAmount: 499.9,
      startsAt: new Date('2026-07-01T00:00:00.000Z'),
      endsAt: null,
      paymentMethod: 'EXTERNAL',
      externalContractNumber: null,
      notes: 'Contrato',
      documentUrl: 'documents/contract.pdf',
      status: 'IN_REVIEW',
    };
    const tx = {
      manualContract: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(contract),
        count: vi.fn(),
      },
      companySubscription: { upsert: vi.fn(), updateMany: vi.fn() },
      company: { update: vi.fn() },
      auditLog: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
    } as any;
    const repository = new ManualContractsRepository(prisma);

    await repository.transition(
      'contract-1',
      'DRAFT',
      'IN_REVIEW',
      'actor-1',
      'Revisao comercial iniciada',
    );

    expect(tx.manualContract.updateMany).toHaveBeenCalledWith({
      where: { id: 'contract-1', status: 'DRAFT' },
      data: { status: 'IN_REVIEW' },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'MANUAL_CONTRACT_STATUS_CHANGED',
        entity: 'ManualContract',
        entityId: 'contract-1',
        metadata: expect.objectContaining({
          from: 'DRAFT',
          to: 'IN_REVIEW',
          reason: 'Revisao comercial iniciada',
        }),
      }),
    });
  });

  it('does not write audit data when another request changed the status first', async () => {
    const tx = {
      manualContract: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      auditLog: { create: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
    } as any;
    const repository = new ManualContractsRepository(prisma);

    await expect(repository.transition(
      'contract-1',
      'DRAFT',
      'IN_REVIEW',
      'actor-1',
      'Revisao',
    )).resolves.toBeNull();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
