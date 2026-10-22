import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { AsaasWebhookController } from './asaas-webhook.controller';
import { MercadoPagoService } from './mercadopago.service';
import { MercadoPagoWebhookController } from './mercadopago-webhook.controller';

const SECRET = 'mp-secret-for-tests';
const sign = (dataId: string, requestId: string, ts: string) =>
  crypto.createHmac('sha256', SECRET).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest('hex');

const mpController = (secret?: string) =>
  new MercadoPagoWebhookController({} as any, new MercadoPagoService(new ConfigService(secret ? { MERCADOPAGO_WEBHOOK_SECRET: secret } : {})), {} as any);
const asaasController = () => new AsaasWebhookController({} as any, {} as any);
const body = { type: 'ignored-type', data: { id: 'P1' } };

const savedEnv = { ...process.env };
afterEach(() => {
  process.env = { ...savedEnv };
  vi.restoreAllMocks();
});

describe('webhook Mercado Pago — autenticação', () => {
  it('sem assinatura → 403', async () => {
    await expect(mpController(SECRET).handle(undefined, 'r1', undefined, undefined, body)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assinatura errada → 403', async () => {
    const ts = String(Date.now());
    await expect(mpController(SECRET).handle(`ts=${ts},v1=deadbeef`, 'r1', undefined, undefined, body)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assinatura certa → 200 (aceito)', async () => {
    const ts = String(Date.now());
    await expect(mpController(SECRET).handle(`ts=${ts},v1=${sign('P1', 'r1', ts)}`, 'r1', undefined, undefined, body)).resolves.toEqual({ received: true, ignored: true });
  });

  it('replay (assinatura válida porém antiga) → 403', async () => {
    const ts = String(Date.now() - 15 * 60 * 1000);
    await expect(mpController(SECRET).handle(`ts=${ts},v1=${sign('P1', 'r1', ts)}`, 'r1', undefined, undefined, body)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sem segredo configurado → 403 mesmo em desenvolvimento', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.MERCADOPAGO_WEBHOOK_INSECURE;
    await expect(mpController().handle(undefined, 'r1', undefined, undefined, body)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sem segredo: só passa em dev com MERCADOPAGO_WEBHOOK_INSECURE=true; nunca em produção', async () => {
    process.env.NODE_ENV = 'development';
    process.env.MERCADOPAGO_WEBHOOK_INSECURE = 'true';
    await expect(mpController().handle(undefined, 'r1', undefined, undefined, body)).resolves.toEqual({ received: true, ignored: true });
    process.env.NODE_ENV = 'production';
    await expect(mpController().handle(undefined, 'r1', undefined, undefined, body)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('webhook Asaas — autenticação', () => {
  it('token ausente no request → 403', async () => {
    process.env.ASAAS_WEBHOOK_TOKEN = 'asaas-token-value';
    await expect(asaasController().handleAsaasWebhook(undefined, { event: 'X' } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('token errado → 403', async () => {
    process.env.ASAAS_WEBHOOK_TOKEN = 'asaas-token-value';
    await expect(asaasController().handleAsaasWebhook('outro', { event: 'X' } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sem token configurado → 403 mesmo em desenvolvimento', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ASAAS_WEBHOOK_TOKEN;
    delete process.env.ASAAS_WEBHOOK_SECRET;
    delete process.env.ASAAS_WEBHOOK_INSECURE;
    await expect(asaasController().handleAsaasWebhook(undefined, { event: 'X' } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sem token configurado: bypass só com ASAAS_WEBHOOK_INSECURE=true fora de produção', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ASAAS_WEBHOOK_TOKEN;
    delete process.env.ASAAS_WEBHOOK_SECRET;
    process.env.ASAAS_WEBHOOK_INSECURE = 'true';
    await expect(asaasController().handleAsaasWebhook(undefined, {} as any)).resolves.toEqual({ received: true, ignored: true });
    process.env.NODE_ENV = 'production';
    await expect(asaasController().handleAsaasWebhook(undefined, {} as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
