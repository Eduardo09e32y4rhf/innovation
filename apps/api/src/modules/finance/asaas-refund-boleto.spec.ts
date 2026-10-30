import { afterEach, describe, expect, it, vi } from 'vitest';
import { AsaasService } from './asaas.service';

// PAG-10 (caracterizacao): hoje QUALQUER cobranca, inclusive boleto, usa /payments/{id}/refund.
// Quando o sandbox confirmar o contrato de POST /payments/{id}/bankSlip/refund, este teste deve ser trocado.
vi.mock('../../common/http/outbound', () => ({ TIMEOUT_PAYMENT_GATEWAY_MS: 1, outboundFetch: vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'pay_1' }) })) }));

afterEach(() => vi.clearAllMocks());

describe('AsaasService.refundPayment (caracterizacao PAG-10)', () => {
  it('usa sempre o endpoint /refund (sem tratamento especifico de boleto)', async () => {
    const { outboundFetch } = await import('../../common/http/outbound');
    const svc = new AsaasService({ get: (k: string) => (k === 'ASAAS_API_KEY' ? 'k_sandbox' : undefined) } as any);
    await svc.refundPayment('pay_1', 10, 'x');
    const [url, init] = (outboundFetch as any).mock.calls[0];
    expect(String(url)).toMatch(/\/payments\/pay_1\/refund$/);
    expect(String(url)).not.toContain('bankSlip');
    expect(init.method).toBe('POST');
  });
});
