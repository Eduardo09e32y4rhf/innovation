import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WEB = join(__dirname, '..', '..', 'apps', 'web', 'app');
const read = (file: string) => readFileSync(join(WEB, file), 'utf8');

// GET /finance/company/status passou a ser somente leitura (PAG-A2): a baixa vem do webhook ou da conciliacao.
// As telas que esperam o pagamento precisam pedir a conciliacao antes de consultar o status.
describe('telas de pagamento pedem a conciliacao antes de consultar o status', () => {
  it.each([['pagamento/retorno/page.tsx'], ['[tenant]/fatura-pendente/page.tsx']])('%s', (file) => {
    const source = read(file);
    const sync = source.indexOf('companyBilling.syncPayment()');
    const status = source.indexOf('companyBilling.status()');
    expect(sync, 'deve chamar companyBilling.syncPayment()').toBeGreaterThan(-1);
    expect(status).toBeGreaterThan(-1);
    expect(sync).toBeLessThan(status);
  });

  it('o cliente da API expoe POST /finance/company/sync-payment', () => {
    const api = read('lib/api.ts');
    expect(api).toMatch(/syncPayment:[^\n]*\/finance\/company\/sync-payment[^\n]*method: 'POST'/);
  });
});
