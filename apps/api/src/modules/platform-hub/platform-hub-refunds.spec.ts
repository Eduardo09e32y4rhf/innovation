import { vi } from 'vitest';
import { PlatformHubService } from './platform-hub.service';

/** O painel global tem que bater com platform-finance.service: recebido = pago - estornado (nunca negativo). */
function servico(paid: { amount: number | null; refundedAmount: number | null }) {
  const vazio = vi.fn().mockResolvedValue([]);
  const prisma: any = {
    company: { groupBy: vazio, count: vi.fn().mockResolvedValue(0), findMany: vazio },
    user: { count: vi.fn().mockResolvedValue(0) },
    employee: { count: vi.fn().mockResolvedValue(0) },
    platformInvoice: {
      groupBy: vi.fn().mockImplementation(async (args: any) =>
        args.by[0] === 'status' ? [{ status: 'PAID', _count: 1, _sum: { amount: paid.amount, refundedAmount: paid.refundedAmount } }] : []),
    },
    auditLog: { findMany: vazio },
    supportTicket: { count: vi.fn().mockResolvedValue(0) },
    asaasWebhookEvent: { count: vi.fn().mockResolvedValue(0) },
  };
  return { service: new PlatformHubService(prisma), prisma };
}
const dev: any = { sub: 'u1', role: 'DEV', email: 'dev@x.com' };

describe('PlatformHubService.overview: recebido desconta estornos', () => {
  it('fatura paga de 1.000 com 300 estornados = 700 recebidos', async () => {
    const { service } = servico({ amount: 1000, refundedAmount: 300 });
    const res: any = await service.overview(dev);
    expect(res.finance.received).toBe(700);
  });

  it('sem estorno continua igual ao valor pago', async () => {
    const { service } = servico({ amount: 1000, refundedAmount: 0 });
    expect((await service.overview(dev) as any).finance.received).toBe(1000);
  });

  it('estorno maior que o pago nunca deixa o recebido negativo', async () => {
    const { service } = servico({ amount: 100, refundedAmount: 150 });
    expect((await service.overview(dev) as any).finance.received).toBe(0);
  });

  it('valores nulos do banco viram zero', async () => {
    const { service } = servico({ amount: null, refundedAmount: null });
    expect((await service.overview(dev) as any).finance.received).toBe(0);
  });
});
