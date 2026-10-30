import { afterEach, describe, expect, it } from 'vitest';
import { productionEnvProblems, turnstileBootStatus, validateEnv } from './env.validation';

const strong = {
  ALLOWED_ORIGINS: 'https://app.exemplo.com',
  JWT_SECRET: 'a'.repeat(31) + 'Z9' + 'f'.repeat(10),
  KMS_MASTER_KEY: 'b1'.repeat(32),
  DATABASE_URL: 'postgresql://app:Xk29fjs82hD7qLmPz0@db:5432/app',
  REDIS_URL: 'redis://:Zq81hs72Dk0LpWm3@redis:6379',
  METRICS_TOKEN: 'm3tr1cs-t0k3n-Zq81hs72',
};

describe('RS-C-02: Turnstile no boot de producao', () => {
  const original = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = original; });

  it('TURNSTILE_ENFORCE=true sem TURNSTILE_SECRET_KEY e problema de configuracao', () => {
    const problems = productionEnvProblems({ ...strong, TURNSTILE_ENFORCE: 'true' }).join('\n');
    expect(problems).toMatch(/TURNSTILE_SECRET_KEY is required when TURNSTILE_ENFORCE=true/);
  });

  it('TURNSTILE_ENFORCE=true com chave configurada passa', () => {
    expect(productionEnvProblems({ ...strong, TURNSTILE_ENFORCE: 'true', TURNSTILE_SECRET_KEY: '0x4AAAAAAAxxxxxxxxxxxxxxxxxxxxxxxx' })).toEqual([]);
  });

  it('quem ainda nao configurou nada nao quebra (sem ENFORCE)', () => {
    expect(productionEnvProblems(strong)).toEqual([]);
    expect(productionEnvProblems({ ...strong, TURNSTILE_ENFORCE: 'false' })).toEqual([]);
  });

  it('validateEnv derruba o boot em producao com ENFORCE sem chave', () => {
    process.env.NODE_ENV = 'production';
    expect(() => validateEnv({ ...strong, TURNSTILE_ENFORCE: 'true' })).toThrow(/TURNSTILE_SECRET_KEY/);
  });

  it('validateEnv em producao sem ENFORCE e sem chave nao derruba', () => {
    process.env.NODE_ENV = 'production';
    expect(() => validateEnv({ ...strong })).not.toThrow();
  });

  it('turnstileBootStatus descreve o estado para o log e para a tela do DEV', () => {
    expect(turnstileBootStatus({ NODE_ENV: 'production' })).toMatchObject({ level: 'alarm', enabled: false, enforce: false });
    expect(turnstileBootStatus({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'x', TURNSTILE_ENFORCE: 'true' })).toMatchObject({ level: 'ok', enabled: true, enforce: true });
    expect(turnstileBootStatus({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'x' })).toMatchObject({ level: 'warn', enabled: true, enforce: false });
    expect(turnstileBootStatus({ NODE_ENV: 'production', TURNSTILE_ENFORCE: 'true' })).toMatchObject({ level: 'error' });
    expect(turnstileBootStatus({ NODE_ENV: 'development' })).toMatchObject({ level: 'info' });
    expect(JSON.stringify(turnstileBootStatus({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'segredo-123' }))).not.toContain('segredo-123');
  });
});
