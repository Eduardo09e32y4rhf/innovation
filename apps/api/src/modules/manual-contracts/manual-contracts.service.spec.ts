import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ManualContractsService } from './manual-contracts.service';

const baseContract = {
  id: 'contract-1',
  companyId: 'company-1',
  planId: 'plan-1',
  seatQuantity: 10,
  agreedAmount: 499.9,
  startsAt: new Date('2026-07-01T00:00:00.000Z'),
  endsAt: null,
  paymentMethod: 'EXTERNAL',
  externalContractNumber: null,
  notes: 'Contrato comercial',
  documentUrl: 'documents/contract-1.pdf',
  status: 'DRAFT',
};

function setup(contract: any = baseContract) {
  const repository = {
    list: vi.fn(),
    findById: vi.fn().mockResolvedValue(contract),
    history: vi.fn(),
    findCompany: vi.fn(),
    findPlan: vi.fn().mockResolvedValue({ id: 'plan-1' }),
    createWithActivation: vi.fn(),
    updateDetails: vi.fn().mockResolvedValue(contract),
    transition: vi.fn().mockImplementation(
      async (_id, _from, to) => ({ ...contract, status: to }),
    ),
    recordEvent: vi.fn(),
    delete: vi.fn(),
  } as any;
  const finance = {
    ensureManualContractBilling: vi.fn().mockResolvedValue({ configured: true, created: true }),
  } as any;
  return {
    service: new ManualContractsService(repository, finance),
    repository,
    finance,
  };
}

describe('ManualContractsService lifecycle', () => {
  it('allows commercial data edits while the contract is a draft', async () => {
    const { service, repository } = setup();

    await service.update('contract-1', { seatQuantity: 12 }, 'actor-1');

    expect(repository.updateDetails).toHaveBeenCalledWith(
      'contract-1',
      expect.objectContaining({ seatQuantity: 12 }),
      'actor-1',
      baseContract,
    );
  });

  it('blocks silent edits to an active contract', async () => {
    const { service, repository } = setup({ ...baseContract, status: 'ACTIVE' });

    await expect(service.update('contract-1', { agreedAmount: 599.9 }, 'actor-1'))
      .rejects.toBeInstanceOf(ConflictException);
    expect(repository.updateDetails).not.toHaveBeenCalled();
  });

  it('executes a valid lifecycle transition and records its reason', async () => {
    const { service, repository } = setup();

    await expect(service.transition('contract-1', {
      status: 'IN_REVIEW',
      reason: 'Valores conferidos pelo comercial',
    }, 'actor-1')).resolves.toMatchObject({ status: 'IN_REVIEW' });

    expect(repository.transition).toHaveBeenCalledWith(
      'contract-1',
      'DRAFT',
      'IN_REVIEW',
      'actor-1',
      'Valores conferidos pelo comercial',
      undefined,
    );
  });

  it('exposes only the transitions allowed from the current state', async () => {
    const { service } = setup({ ...baseContract, status: 'ACTIVE' });

    await expect(service.availableTransitions('contract-1')).resolves.toEqual({
      currentStatus: 'ACTIVE',
      allowed: ['SUSPENDED', 'TERMINATION_SCHEDULED', 'ENDED', 'CANCELED', 'EXPIRED'],
      termsLocked: true,
    });
  });

  it('keeps PATCH compatibility by routing status changes through the lifecycle', async () => {
    const { service, repository } = setup();

    await service.update('contract-1', { status: 'IN_REVIEW' }, 'actor-1');

    expect(repository.transition).toHaveBeenCalledWith(
      'contract-1',
      'DRAFT',
      'IN_REVIEW',
      'actor-1',
      'Transicao solicitada pelo endpoint de atualizacao legado.',
      undefined,
    );
  });

  it('rejects status and commercial data changes in the same legacy request', async () => {
    const { service } = setup();

    await expect(service.update('contract-1', {
      status: 'IN_REVIEW',
      seatQuantity: 12,
    }, 'actor-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects lifecycle jumps', async () => {
    const { service, repository } = setup();

    await expect(service.transition('contract-1', {
      status: 'ACTIVE',
      reason: 'Ativar imediatamente',
    }, 'actor-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.transition).not.toHaveBeenCalled();
  });

  it('requires a document before sending a contract for acceptance', async () => {
    const { service } = setup({
      ...baseContract,
      status: 'IN_REVIEW',
      documentUrl: null,
    });

    await expect(service.transition('contract-1', {
      status: 'PENDING_ACCEPTANCE',
      reason: 'Enviar ao cliente',
    }, 'actor-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('activates an accepted contract and prepares its billing once', async () => {
    const accepted = { ...baseContract, status: 'PENDING_ACCEPTANCE' };
    const { service, repository, finance } = setup(accepted);

    await expect(service.transition('contract-1', {
      status: 'ACTIVE',
      reason: 'Aceite confirmado',
    }, 'actor-1')).resolves.toMatchObject({
      status: 'ACTIVE',
      billingSetupPending: false,
    });

    expect(finance.ensureManualContractBilling).toHaveBeenCalledOnce();
    expect(repository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
      'actor-1',
      'MANUAL_CONTRACT_BILLING_READY',
      expect.objectContaining({ nextDueDate: expect.any(String) }),
    );
  });

  it('exposes a pending billing flag and audits integration failure', async () => {
    const accepted = { ...baseContract, status: 'PENDING_ACCEPTANCE' };
    const { service, repository, finance } = setup(accepted);
    finance.ensureManualContractBilling.mockRejectedValue(new Error('Asaas indisponivel'));

    await expect(service.transition('contract-1', {
      status: 'ACTIVE',
      reason: 'Aceite confirmado',
    }, 'actor-1')).resolves.toMatchObject({
      status: 'ACTIVE',
      billingSetupPending: true,
    });
    expect(repository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
      'actor-1',
      'MANUAL_CONTRACT_BILLING_FAILED',
      { message: 'Asaas indisponivel' },
    );
  });

  it('requires a future end date to schedule termination', async () => {
    const { service } = setup({ ...baseContract, status: 'ACTIVE' });

    await expect(service.transition('contract-1', {
      status: 'TERMINATION_SCHEDULED',
      reason: 'Solicitacao do cliente',
      endsAt: '2020-01-01T00:00:00.000Z',
    }, 'actor-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reports an optimistic concurrency conflict', async () => {
    const { service, repository } = setup();
    repository.transition.mockResolvedValue(null);

    await expect(service.transition('contract-1', {
      status: 'IN_REVIEW',
      reason: 'Revisao iniciada',
    }, 'actor-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('preserves operational history by deleting drafts only', async () => {
    const { service, repository } = setup({ ...baseContract, status: 'ENDED' });

    await expect(service.delete('contract-1', 'actor-1'))
      .rejects.toBeInstanceOf(ConflictException);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('returns not found for unknown contracts', async () => {
    const { service } = setup(null);

    await expect(service.get('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
