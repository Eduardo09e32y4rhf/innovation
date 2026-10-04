import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { MercadoPagoService } from './mercadopago.service';

const make = (values: Record<string, string>) => new MercadoPagoService(new ConfigService(values));
const sign = (secret: string, dataId: string, requestId: string, ts: string) =>
  crypto.createHmac('sha256', secret).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest('hex');

describe('MercadoPagoService', () => {
  it('detecta modo pelo prefixo do token', () => {
    expect(make({}).mode()).toBe('unconfigured');
    expect(make({ MERCADOPAGO_ACCESS_TOKEN: 'TEST-123' }).mode()).toBe('sandbox');
    expect(make({ MERCADOPAGO_ACCESS_TOKEN: 'APP_USR-123' }).mode()).toBe('production');
  });

  it('valida a assinatura do webhook', () => {
    const service = make({ MERCADOPAGO_WEBHOOK_SECRET: 'segredo' });
    const ts = '1700000000';
    const v1 = sign('segredo', 'ABC123', 'req-1', ts);
    expect(service.verifySignature({ signature: `ts=${ts},v1=${v1}`, requestId: 'req-1', dataId: 'ABC123' })).toBe(true);
    expect(service.verifySignature({ signature: `ts=${ts},v1=${v1}`, requestId: 'req-2', dataId: 'ABC123' })).toBe(false);
    expect(service.verifySignature({ signature: `ts=${ts},v1=deadbeef`, requestId: 'req-1', dataId: 'ABC123' })).toBe(false);
    expect(service.verifySignature({ requestId: 'req-1', dataId: 'ABC123' })).toBe(false);
  });

  it('rejeita assinatura quando não há segredo configurado', () => {
    expect(make({}).verifySignature({ signature: 'ts=1,v1=aa', requestId: 'r', dataId: '1' })).toBe(false);
  });

  it('mapeia status: só estorno/chargeback cancelam; recusa mantém a fatura aberta', () => {
    const service = make({});
    expect(service.mapStatus('approved')).toBe('PAID');
    expect(service.mapStatus('pending')).toBe('OPEN');
    expect(service.mapStatus('rejected')).toBe('OPEN');
    expect(service.mapStatus('refunded')).toBe('CANCELED');
    expect(service.mapStatus('charged_back')).toBe('CANCELED');
  });

  it('sem token, chamadas à API falham com erro claro (nunca resposta vazia)', async () => {
    await expect(make({}).getPayment('1')).rejects.toThrow(/MERCADOPAGO_ACCESS_TOKEN/);
  });
});
