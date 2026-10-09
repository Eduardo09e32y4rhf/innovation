import { describe, expect, it, vi } from 'vitest';
import { FaturasAcoesService } from './faturas-acoes.service';
import { PricingService } from './pricing.service';

const DAY = 86_400_000;
const actor = { sub: 'u1', email: 'dev@x.com', role: 'DEV' } as never;

/** Plano básico: base R$ 249,99 + R$ 3,00 por usuário. Upgrade de 1 para 3 usuários = R$ 6,00/mês; faltam 36 de 38 dias = R$ 5,68. */
function setup(options: { next?: Record<string, unknown> | null; remote?: Record<string, unknown> } = {}) {
  const now = Date.now();
  const prisma = {
    company: { findFirst: vi.fn().mockResolvedValue({ id: 'c1' }) },
    companySubscription: {
      findUnique: vi.fn().mockResolvedValue({
        seatQuantity: 1, planId: 'p1', couponType: null, couponCyclesLeft: null, couponValue: null,
        nextDueDate: new Date(now + 36 * DAY), currentPeriodStart: new Date(now - 2 * DAY),
        plan: { id: 'p1', maxUsers: null, commitmentMonths: 1, baseMonthlyPrice: 249.99, userMonthlyPrice: 3, price: 249.99, includedUnits: 0 },
      }),
    },
    platformInvoice: {
      findFirst: vi.fn().mockResolvedValue(options.next === undefined ? { id: 'i1', description: 'Mensalidade basico (1 usuarios)', asaasPaymentId: 'pay_1' } : options.next),
    },
    invoiceAdjustment: { create: vi.fn().mockResolvedValue({ id: 'adj-1' }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const finance = {
    changeSeatQuantity: vi.fn().mockResolvedValue({ changed: true, scheduled: false }),
    update: vi.fn().mockResolvedValue({ id: 'i1' }),
    createCharge: vi.fn().mockResolvedValue({ id: 'sep-1' }),
  };
  const asaas = {
    isConfigured: () => true,
    getCharge: vi.fn().mockResolvedValue(options.remote ?? { subscription: 'sub_1', status: 'PENDING', value: 258.99 }),
  };
  const service = new FaturasAcoesService(prisma as never, finance as never, asaas as never, {} as never, new PricingService(), {} as never);
  return { service, finance, asaas, prisma };
}

describe('rateio de upgrade de usuários', () => {
  it('soma o rateio à próxima fatura da assinatura (um só boleto)', async () => {
    const { service, finance } = setup();
    const result = await service.changeSeats('c1', 3, 'teste', actor);
    // 3 usuários = 249,99 + 9,00 = 258,99 (valor que o Asaas já reprecificou) + rateio 5,68
    expect(finance.update).toHaveBeenCalledWith('i1', expect.objectContaining({ amount: 264.67 }));
    expect(finance.update.mock.calls[0][1].description).toContain('Mensalidade basico (1 usuarios) + rateio upgrade de 1 para 3 usuarios');
    expect(finance.createCharge).not.toHaveBeenCalled();
    expect(result).toMatchObject({ prorationAmount: 5.68, prorationMerged: true });
  });

  it('um segundo upgrade no mesmo ciclo não repete o texto do rateio anterior', async () => {
    const { service, finance } = setup({ next: { id: 'i1', description: 'Mensalidade basico (1 usuarios) + rateio upgrade de 1 para 2 usuarios', asaasPaymentId: 'pay_1' } });
    await service.changeSeats('c1', 3, 'teste', actor);
    expect(finance.update.mock.calls[0][1].description.match(/\+ rateio/g)).toHaveLength(1);
  });

  it('sem fatura aberta para somar, cobra em fatura separada', async () => {
    const { service, finance } = setup({ next: null });
    const result = await service.changeSeats('c1', 3, 'teste', actor);
    expect(finance.update).not.toHaveBeenCalled();
    expect(finance.createCharge).toHaveBeenCalledWith(expect.objectContaining({ amount: 5.68 }));
    expect(result.prorationMerged).toBe(false);
  });

  it('fatura que já foi paga ou venceu no provedor não recebe o rateio', async () => {
    for (const status of ['RECEIVED', 'OVERDUE']) {
      const { service, finance } = setup({ remote: { subscription: 'sub_1', status, value: 258.99 } });
      const result = await service.changeSeats('c1', 3, 'teste', actor);
      expect(finance.update).not.toHaveBeenCalled();
      expect(result.prorationMerged).toBe(false);
    }
  });

  it('fatura avulsa (sem assinatura no provedor) não recebe o rateio', async () => {
    const { service, finance } = setup({ remote: { status: 'PENDING', value: 50 } });
    const result = await service.changeSeats('c1', 3, 'teste', actor);
    expect(finance.update).not.toHaveBeenCalled();
    expect(result.prorationMerged).toBe(false);
  });

  it('downgrade não gera rateio nenhum', async () => {
    const { service, finance } = setup();
    finance.changeSeatQuantity.mockResolvedValue({ changed: true, scheduled: true });
    const result = await service.changeSeats('c1', 1, 'teste', actor);
    expect(finance.update).not.toHaveBeenCalled();
    expect(finance.createCharge).not.toHaveBeenCalled();
    expect(result.prorationAmount).toBe(0);
  });
});
