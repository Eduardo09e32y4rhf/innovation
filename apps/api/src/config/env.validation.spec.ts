import { productionEnvProblems } from './env.validation';

const strong = {
  ALLOWED_ORIGINS: 'https://app.exemplo.com',
  JWT_SECRET: 'a'.repeat(31) + 'Z9' + 'f'.repeat(10),
  KMS_MASTER_KEY: 'b1'.repeat(32),
  DATABASE_URL: 'postgresql://app:Xk29fjs82hD7qLmPz0@db:5432/app',
  REDIS_URL: 'redis://:Zq81hs72Dk0LpWm3@redis:6379',
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

  it('só exige o segredo do webhook do provedor configurado', () => {
    expect(productionEnvProblems(strong)).toEqual([]);
    expect(productionEnvProblems({ ...strong, ASAAS_API_KEY: 'k' }).join()).toMatch(/ASAAS_WEBHOOK_TOKEN/);
    expect(productionEnvProblems({ ...strong, MERCADOPAGO_ACCESS_TOKEN: 't' }).join()).toMatch(/MERCADOPAGO_WEBHOOK_SECRET/);
    expect(productionEnvProblems({ ...strong, ASAAS_API_KEY: 'k', ASAAS_WEBHOOK_TOKEN: 'x'.repeat(32) })).toEqual([]);
  });
});
