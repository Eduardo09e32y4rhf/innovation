import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('contrato de inicialização da produção', () => {
  it('gera token interno sem inventar credenciais dos provedores', () => {
    const bootstrap = read('scripts/security/bootstrap-env.sh');
    const validation = read('apps/api/src/config/env.validation.ts');
    expect(bootstrap).toMatch(/put METRICS_TOKEN /);
    expect(bootstrap).not.toMatch(/put ASAAS_WEBHOOK_TOKEN /);
    expect(bootstrap).not.toMatch(/put MERCADOPAGO_WEBHOOK_SECRET /);
    expect(validation).toContain("if (text('ASAAS_API_KEY'))");
    expect(validation).toContain("if (text('MERCADOPAGO_ACCESS_TOKEN'))");
  });

  it('libera no CORS os headers usados pelo cliente web', () => {
    const main = read('apps/api/src/main.ts');
    expect(main).toContain("'Idempotency-Key'");
    expect(main).toContain("'X-Request-Id'");
  });
});
