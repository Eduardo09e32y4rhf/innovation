import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { assertInWallet, isInWallet, walletOwnerId } from '../../common/permissions/commercial-wallet';
import { ProposalsService } from './proposals.service';

const comercial = { sub: 'com-1', role: 'COMERCIAL' };
const dev = { sub: 'dev-1', role: 'DEV' };

describe('carteira do Comercial', () => {
  it('so COMERCIAL e restrito; o dono da carteira passa, outro nao', () => {
    expect(walletOwnerId(comercial)).toBe('com-1');
    expect(walletOwnerId(dev)).toBeUndefined();
    expect(isInWallet(comercial, { commercialOwnerId: 'com-1' })).toBe(true);
    expect(isInWallet(comercial, { commercialOwnerId: 'com-2' })).toBe(false);
    expect(isInWallet(comercial, { commercialOwnerId: null })).toBe(false);
    expect(isInWallet(dev, { commercialOwnerId: 'com-2' })).toBe(true);
    expect(() => assertInWallet(comercial, { commercialOwnerId: 'x' }, 'nao')).toThrow(NotFoundException);
  });
});

describe('ProposalsService: carteira', () => {
  function build(ownerId: string | null) {
    const prisma: any = {
      company: { findUnique: vi.fn(async () => ({ id: 'c1', commercialOwnerId: ownerId })) },
      proposal: {
        create: vi.fn(async (a: any) => ({ id: 'p1', ...a.data })),
        findUnique: vi.fn(async () => ({ id: 'p1', status: 'DRAFT', company: { commercialOwnerId: ownerId } })),
        update: vi.fn(async () => ({ id: 'p1', status: 'SENT' })),
        findMany: vi.fn(async () => []),
      },
      proposalAuditLog: { create: vi.fn(async () => ({})) },
    };
    return { service: new ProposalsService(prisma, {} as any), prisma };
  }
  const dto: any = { companyId: 'c1', title: 't', startDate: '2026-10-10', planType: 'P', monthlyPrice: 1, usersLimit: 1, employeesLimit: 1, features: [] };

  it('Comercial nao cria nem envia proposta de empresa de outra carteira', async () => {
    const { service, prisma } = build('com-2');
    await expect(service.createProposal('com-1', dto, comercial)).rejects.toThrow(NotFoundException);
    await expect(service.sendProposal('p1', 'com-1', comercial)).rejects.toThrow(NotFoundException);
    expect(prisma.proposal.create).not.toHaveBeenCalled();
    expect(prisma.proposal.update).not.toHaveBeenCalled();
  });

  it('Comercial opera a propria carteira; envio nao afirma e-mail enviado', async () => {
    const { service, prisma } = build('com-1');
    await service.createProposal('com-1', dto, comercial);
    await service.sendProposal('p1', 'com-1', comercial);
    const meta = JSON.parse(prisma.proposalAuditLog.create.mock.calls.at(-1)[0].data.metadata);
    expect(meta.emailSent).toBe(false);
  });

  it('listagem do Comercial filtra pela carteira; DEV ve tudo', async () => {
    const { service, prisma } = build('com-1');
    await service.listProposals(undefined, comercial);
    expect(prisma.proposal.findMany.mock.calls[0][0].where).toEqual({ company: { commercialOwnerId: 'com-1' } });
    await service.listProposals(undefined, dev);
    expect(prisma.proposal.findMany.mock.calls[1][0].where).toEqual({});
  });
});