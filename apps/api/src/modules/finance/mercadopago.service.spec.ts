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
    const ts = String(Date.now());
    const v1 = sign('segredo', 'ABC123', 'req-1', ts);
    expect(service.verifySignature({ signature: `ts=${ts},v1=${v1}`, requestId: 'req-1', dataId: 'ABC123' })).toBe(true);
    expect(service.verifySignature({ signature: `ts=${ts},v1=${v1}`, requestId: 'req-2', dataId: 'ABC123' })).toBe(false);
    expect(service.verifySignature({ signature: `ts=${ts},v1=deadbeef`, requestId: 'req-1', dataId: 'ABC123' })).toBe(false);
    expect(service.verifySignature({ requestId: 'req-1', dataId: 'ABC123' })).toBe(false);
  });

  it('rejeita replay: ts fora da janela de 5 min (ms ou s), aceita ts em segundos recente', () => {
    const service = make({ MERCADOPAGO_WEBHOOK_SECRET: 'segredo' });
    const old = String(Date.now() - 10 * 60 * 1000);
    expect(service.verifySignature({ signature: `ts=${old},v1=${sign('segredo', 'A1', 'r', old)}`, requestId: 'r', dataId: 'A1' })).toBe(false);
    const oldSeconds = String(Math.floor(Date.now() / 1000) - 3600);
    expect(service.verifySignature({ signature: `ts=${oldSeconds},v1=${sign('segredo', 'A1', 'r', oldSeconds)}`, requestId: 'r', dataId: 'A1' })).toBe(false);
    const recentSeconds = String(Math.floor(Date.now() / 1000));
    expect(service.verifySignature({ signature: `ts=${recentSeconds},v1=${sign('segredo', 'A1', 'r', recentSeconds)}`, requestId: 'r', dataId: 'A1' })).toBe(true);
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
