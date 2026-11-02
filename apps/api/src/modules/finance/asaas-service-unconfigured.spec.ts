import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, describe, expect, it } from 'vitest';
import { AsaasService } from './asaas.service';

const cfg = (v: Record<string, string> = {}) => ({ get: (k: string) => v[k] }) as any;
const env = process.env.NODE_ENV;
const mock = process.env.ALLOW_MOCK_PAYMENTS;
afterEach(() => {
  process.env.NODE_ENV = env;
  if (mock === undefined) delete process.env.ALLOW_MOCK_PAYMENTS; else process.env.ALLOW_MOCK_PAYMENTS = mock;
});

describe('AsaasService sem ASAAS_API_KEY (PAG-04)', () => {
  it('producao sem chave lanca 503, mesmo com ALLOW_MOCK_PAYMENTS=true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_MOCK_PAYMENTS = 'true';
    await expect(new AsaasService(cfg()).createCustomer({ name: 'a', cpfCnpj: '1' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('dev sem ALLOW_MOCK_PAYMENTS lanca', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOW_MOCK_PAYMENTS;
    await expect(new AsaasService(cfg()).createCustomer({ name: 'a', cpfCnpj: '1' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('dev com ALLOW_MOCK_PAYMENTS=true devolve vazio', async () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_MOCK_PAYMENTS = 'true';
    await expect(new AsaasService(cfg()).createCustomer({ name: 'a', cpfCnpj: '1' })).resolves.toEqual({});
  });
});
