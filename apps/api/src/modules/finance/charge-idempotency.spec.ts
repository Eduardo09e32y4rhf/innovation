import { describe, expect, it } from 'vitest';
import { PlatformFinanceService } from './platform-finance.service';

const COMPANY = { id: '11111111-1111-4111-8111-111111111111', name: 'Acme', users: [] };
const KEY = '3f2b8c1e-9d4a-4e7b-8a10-5c6d7e8f9a0b';

function setup() {
  const store = new Map<string, any>();
  let creates = 0;
  const prisma: any = {
    company: { findUnique: async () => COMPANY },
    platformInvoice: {
      findUnique: async ({ where }: any) => { await Promise.resolve(); return store.get(where.chargeRequestKey) ?? null; },
      create: async ({ data }: any) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (store.has(data.chargeRequestKey)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        creates += 1;
        const row = { id: `inv-${creates}`, ...data, dueDate: data.dueDate };
        store.set(data.chargeRequestKey, row);
        return row;
      },
    },
  };
  const service = new PlatformFinanceService(prisma, {} as any, {} as any);
  return { service, store, creates: () => creates };
}

const dto = (extra: object = {}) => ({ companyId: COMPANY.id, amount: 100, description: 'Avulsa', dueDate: '2026-12-01', billingType: 'PIX', sendToAsaas: false, idempotencyKey: KEY, ...extra }) as any;

describe('PlatformFinanceService.create — idempotência', () => {
  it('10 chamadas simultâneas com a mesma chave criam 1 única cobrança', async () => {
    const { service, store, creates } = setup();
    const metas = Array.from({ length: 10 }, () => ({ replayed: false }));
    const results = await Promise.all(metas.map((meta) => service.create(dto(), meta)));
    expect(creates()).toBe(1);
    expect(store.size).toBe(1);
    expect(new Set(results.map((row: any) => row.id)).size).toBe(1);
    expect(metas.filter((meta) => meta.replayed)).toHaveLength(9);
  });

  it('repetir depois da criação devolve a mesma cobrança marcada como repetição', async () => {
    const { service, creates } = setup();
    const first = { replayed: false };
    const second = { replayed: false };
    const a: any = await service.create(dto(), first);
    const b: any = await service.create(dto(), second);
    expect(b.id).toBe(a.id);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(creates()).toBe(1);
  });

  it('chaves diferentes criam cobranças diferentes', async () => {
    const { service, creates } = setup();
    await service.create(dto());
    await service.create(dto({ idempotencyKey: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d' }));
    expect(creates()).toBe(2);
  });

  it('mesma chave com dados diferentes é recusada', async () => {
    const { service } = setup();
    await service.create(dto());
    await expect(service.create(dto({ amount: 250 }))).rejects.toThrow(/Chave de cobrança/);
  });
});
