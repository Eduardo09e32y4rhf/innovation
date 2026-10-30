import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WEB = join(__dirname, '..', '..', 'apps', 'web', 'app');
const read = (file: string) => readFileSync(join(WEB, file), 'utf8');

// API-05: GET /promotions nao aplica mais promocao; a tela pede POST /promotions/apply-due antes de listar.
describe('API-05 (tela): promocoes vencidas sao aplicadas por POST antes de listar', () => {
  it('o cliente da API tem promotions.applyDue (POST /promotions/apply-due)', () => {
    expect(read('lib/api.ts')).toMatch(/applyDue:[^\n]*\/promotions\/apply-due[^\n]*method: 'POST'/);
  });
  it('a tela de promocoes chama applyDue antes de list e ignora falha de permissao', () => {
    const page = read('[tenant]/dashboard/management/promotions/page.tsx');
    expect(page).toMatch(/api\.promotions\.applyDue\(\)\.catch\(/);
    expect(page.indexOf('applyDue')).toBeLessThan(page.indexOf('api.promotions.list()'));
  });
});

// SEG-10: suporte publico valida o token do Turnstile quando enviado; o formulario passa a envia-lo.
describe('SEG-10 (tela): formulario publico de suporte envia o token do Turnstile', () => {
  it('as rotas /support/public/tickets e /support/public/password-reset estao na lista protegida do cliente', () => {
    const lib = read('lib/turnstile.ts');
    expect(lib).toMatch(/support\\\/public/);
  });
  it('a tela /suporte exibe o widget do Turnstile', () => {
    expect(read('suporte/page.tsx')).toMatch(/<TurnstileWidget/);
  });
});
