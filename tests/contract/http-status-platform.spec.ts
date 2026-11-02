import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../apps/api/src/common/http/outbound', async (orig) => ({
  ...(await orig<any>()),
  outboundFetch: vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) })),
}));
import { PlatformService } from '../../apps/api/src/modules/platform/platform.service';

// API-01: falha do provedor externo (Receita) nao e conflito (409) nem erro interno: 503.
describe('API-01 PlatformService.lookupCnpj', () => {
  it('provedor responde erro HTTP: 503 com mensagem em portugues', async () => {
    const service = new (PlatformService as any)();
    const err: any = await service.lookupCnpj('11222333000181').catch((e: any) => e);
    expect(err.getStatus?.()).toBe(503);
    expect(String(err.message)).toMatch(/CNPJ/);
  });
});
