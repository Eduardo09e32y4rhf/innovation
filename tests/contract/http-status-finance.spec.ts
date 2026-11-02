import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { AsaasWebhookController } from '../../apps/api/src/modules/finance/asaas-webhook.controller';

// API-01: webhook Asaas. Falha transitoria ao gravar o evento = 503 (o provedor reenvia, RFC 9110 15.6.4);
// a logica de pagamento nao muda.
describe('API-01 webhook Asaas', () => {
  it('nao conseguiu persistir o evento: 503 (nao 500)', async () => {
    process.env.ASAAS_WEBHOOK_TOKEN = 'tok';
    const prisma = { asaasWebhookEvent: { findUnique: async () => null, create: async () => { throw new Error('db'); } } };
    const controller = new AsaasWebhookController(prisma as any, { add: async () => undefined } as any);
    const err: any = await controller.handleAsaasWebhook('tok', { id: 'e1', event: 'PAYMENT_RECEIVED' }).catch((e) => e);
    expect(err.getStatus?.()).toBe(503);
    expect(err.message).toMatch(/evento Asaas/);
  });
});
