import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FaturasAcoesService } from './faturas-acoes.service';

const actor = { sub: 'u1', email: 'dev@x.com', role: 'DEV' } as never;

function setup(invoice: Record<string, unknown>) {
  const prisma = {
    company: { findFirst: vi.fn().mockResolvedValue({ id: 'c1' }) },
    platformInvoice: { findFirst: vi.fn().mockResolvedValue({ id: 'i1', companyId: 'c1', status: 'OPEN', provider: 'ASAAS', asaasPaymentId: 'pay_1', billingType: 'UNDEFINED', deletedAt: null, ...invoice }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const finance = { update: vi.fn().mockResolvedValue({ id: 'i1', billingType: 'BOLETO' }) };
  const service = new FaturasAcoesService(prisma as never, finance as never, {} as never, {} as never, {} as never, {} as never);
  return { service, finance, prisma };
}

describe('Gerar boleto (converter cobrança para BOLETO no Asaas)', () => {
  it('troca "cliente escolhe" por BOLETO e audita', async () => {
    const { service, finance, prisma } = setup({});
    await service.convertToBoleto('i1', actor);
    expect(finance.update).toHaveBeenCalledWith('i1', { billingType: 'BOLETO' });
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('já é boleto: não mexe no Asaas', async () => {
    const { service, finance } = setup({ billingType: 'BOLETO' });
    await service.convertToBoleto('i1', actor);
    expect(finance.update).not.toHaveBeenCalled();
  });

  it('recusa fatura paga, cancelada, do Mercado Pago ou sem cobrança no Asaas', async () => {
    for (const override of [{ status: 'PAID' }, { status: 'CANCELED' }, { provider: 'MERCADOPAGO' }, { asaasPaymentId: null }]) {
      const { service, finance } = setup(override);
      await expect(service.convertToBoleto('i1', actor)).rejects.toBeInstanceOf(BadRequestException);
      expect(finance.update).not.toHaveBeenCalled();
    }
  });
});