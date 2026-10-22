import { productionEnvProblems, validateEnv } from './env.validation';

const strong = {
  ALLOWED_ORIGINS: 'https://app.exemplo.com',
  JWT_SECRET: 'a'.repeat(31) + 'Z9' + 'f'.repeat(10),
  KMS_MASTER_KEY: 'b1'.repeat(32),
  DATABASE_URL: 'postgresql://app:Xk29fjs82hD7qLmPz0@db:5432/app',
  REDIS_URL: 'redis://:Zq81hs72Dk0LpWm3@redis:6379',
  METRICS_TOKEN: 'm3tr1cs-t0k3n-Zq81hs72',
  ASAAS_WEBHOOK_TOKEN: 'w'.repeat(20) + 'Q7' + 'k'.repeat(14),
  MERCADOPAGO_WEBHOOK_SECRET: 'mp-webhook-secret-Xk29fjs82',
};

describe('productionEnvProblems', () => {
  it('aceita configuração forte', () => expect(productionEnvProblems(strong)).toEqual([]));

  it('rejeita o JWT_SECRET antigo do compose', () => {
    expect(productionEnvProblems({ ...strong, JWT_SECRET: 'innovation-secret-key-123' }).join()).toMatch(/JWT_SECRET/);
  });

  it('rejeita senha padrão do banco e Redis sem senha', () => {
    const problems = productionEnvProblems({ ...strong, DATABASE_URL: 'postgresql://innovation:innovation@db:5432/x', REDIS_URL: 'redis://redis:6379' }).join('\n');
    expect(problems).toMatch(/weak or default database password/);
    expect(problems).toMatch(/Redis must require a password/);
  });

  it('exige KMS_MASTER_KEY de 64 hex e diferente do JWT', () => {
    expect(productionEnvProblems({ ...strong, KMS_MASTER_KEY: 'curta' }).join()).toMatch(/KMS_MASTER_KEY/);
    expect(productionEnvProblems({ ...strong, KMS_MASTER_KEY: undefined }).join()).toMatch(/KMS_MASTER_KEY/);
  });

  it('exige métricas sempre e segredo somente do provedor configurado', () => {
    const problems = productionEnvProblems({ ...strong, METRICS_TOKEN: undefined, ASAAS_API_KEY: 'asaas-key', ASAAS_WEBHOOK_TOKEN: undefined, MERCADOPAGO_ACCESS_TOKEN: 'mp-token', MERCADOPAGO_WEBHOOK_SECRET: undefined }).join('\n');
    expect(problems).toMatch(/METRICS_TOKEN is required/);
    expect(problems).toMatch(/ASAAS_WEBHOOK_TOKEN is required/);
    expect(problems).toMatch(/MERCADOPAGO_WEBHOOK_SECRET is required/);
    expect(productionEnvProblems({ ...strong, ASAAS_WEBHOOK_TOKEN: undefined, MERCADOPAGO_WEBHOOK_SECRET: undefined })).toEqual([]);
  });

  it('rejeita segredos de exemplo ou curtos e ALLOWED_ORIGINS vazio', () => {
    expect(productionEnvProblems({ ...strong, ASAAS_API_KEY: 'asaas-key', ASAAS_WEBHOOK_TOKEN: 'token_seguro_com_no_minimo_32_caracteres' }).join()).toMatch(/ASAAS_WEBHOOK_TOKEN must be a real secret/);
    expect(productionEnvProblems({ ...strong, METRICS_TOKEN: 'curto' }).join()).toMatch(/METRICS_TOKEN must be a real secret/);
    expect(productionEnvProblems({ ...strong, ALLOWED_ORIGINS: '' }).join()).toMatch(/ALLOWED_ORIGINS/);
  });

  it('validateEnv lança em produção incompleto e passa no completo', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => validateEnv({ ...strong, METRICS_TOKEN: undefined })).toThrow(/METRICS_TOKEN/);
      expect(() => validateEnv({ ...strong })).not.toThrow();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
