import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');

describe('cupons: excluir e editar (tela e API)', () => {
  const controller = read('apps/api/src/modules/coupons/coupons.controller.ts');
  const view = read('apps/web/app/[tenant]/dashboard/platform/financeiro/_views/_cupons.tsx');

  it('a API expoe DELETE /coupons/:id so para DEV e CEO, com auditoria', () => {
    expect(controller).toMatch(/@Delete\(':id'\)/);
    expect(controller).toMatch(/@Roles\('DEV', 'CEO'\)\s*\n\s*@Audited\(\{ action: 'COUPON_DELETED'/);
  });

  it('a tela tem o botao Excluir e chama DELETE /coupons/:id', () => {
    expect(view).toMatch(/Excluir/);
    expect(view).toMatch(/method: 'DELETE'/);
  });

  it('ao editar, a tela envia null nos campos esvaziados (senao o valor antigo continua)', () => {
    expect(view).toMatch(/maxRedemptions: form\.maxRedemptions \? Number\(form\.maxRedemptions\) : null/);
    expect(view).toMatch(/minSeats: form\.minSeats \? Number\(form\.minSeats\) : null/);
    expect(view).toMatch(/startsAt: form\.startsAt \|\| null/);
    expect(view).toMatch(/expiresAt: form\.expiresAt \|\| null/);
  });

  it('ao editar, a tela envia o codigo quando ele muda', () => {
    expect(view).toMatch(/editing\.code !== code && !locked \? \{ \.\.\.payload, code \}/);
  });

  it('o cupom 30DYAGRAT1S entra por migration: teste de 30 dias, sem desconto, repetivel', () => {
    const sql = read('apps/api/prisma/migrations/20261030100000_coupon_30dyagrat1s/migration.sql');
    expect(sql).toMatch(/'30DYAGRAT1S'/);
    expect(sql).toMatch(/'TRIAL_DAYS'/);
    expect(sql).toMatch(/, 30, 'TRIAL_DAYS', NULL, NULL,/); // trialDays 30, sem value nem durationCycles: nunca desconto
    expect(sql).toMatch(/ON CONFLICT \("code"\) DO NOTHING/);
  });
});
