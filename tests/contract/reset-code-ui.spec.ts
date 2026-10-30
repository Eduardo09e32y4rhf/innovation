import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WEB = join(__dirname, '..', '..', 'apps', 'web', 'app');
const read = (file: string) => readFileSync(join(WEB, file), 'utf8');

// SEG-08: o codigo de recuperacao nao vai mais em Notification.extraJson (so o hash fica no banco).
// O RH/ADMIN pede o codigo ao servidor (POST /auth/password-reset/issue-code) e ele aparece uma unica vez.
describe('SEG-08: telas do RH geram o codigo de recuperacao sob demanda', () => {
  const bell = read('[tenant]/dashboard/_components/notification-bell.tsx');
  const gate = read('[tenant]/dashboard/_components/pending-notifications-gate.tsx');

  it('nenhuma tela le mais extraJson.resetCode (nao existe mais no servidor)', () => {
    expect(bell).not.toMatch(/extraJson\??\.resetCode/);
    expect(gate).not.toMatch(/extra\.resetCode/);
  });

  it('as duas telas usam o componente ResetCodeIssuer com o resetRequestUserId da notificacao', () => {
    expect(bell).toMatch(/<ResetCodeIssuer[^>]*resetRequestUserId/);
    expect(gate).toMatch(/<ResetCodeIssuer[^>]*resetRequestUserId/);
  });

  it('o cliente da API chama POST /auth/password-reset/issue-code', () => {
    expect(read('lib/api.ts')).toMatch(/issueResetCode:[^\n]*\/auth\/password-reset\/issue-code[^\n]*method: 'POST'[^\n]*userId/);
  });

  it('o componente mostra o codigo uma vez, com botao Copiar e validade, e nao grava em storage', () => {
    const component = read('[tenant]/dashboard/_components/reset-code-issuer.tsx');
    expect(component).toMatch(/Gerar código/);
    expect(component).toMatch(/Copiar/);
    expect(component).toMatch(/expiresAt/);
    expect(component).not.toMatch(/localStorage|sessionStorage/);
  });
});
