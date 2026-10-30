import 'reflect-metadata';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * API-04: 201 so para criacao de recurso (RFC 9110 15.3.2). Consulta/previa/acao usa 200 (15.3.1).
 * Tabela rota x status esperado, lida da metadata REAL dos controllers (`__httpCode__`; sem decorator o Nest usa 201 no POST).
 * DELETE continua 200 com corpo (envelope {success,data}); nao migrado para 204.
 */
const SRC = join(__dirname, '../../apps/api/src');
const EXPECT_200 = [
  'POST /accounting/companies/:companyId/periods/:month/calculate', 'POST /accounting/rules/simulate',
  'POST /ai/platform/assistant', 'POST /ai/platform/company/:id/risk', 'POST /ai/platform/company/:id/summary',
  'POST /ai/support/classify', 'POST /ai/support/ticket/:id/suggest-reply', 'POST /ai/support/ticket/:id/summarize',
  'POST /auth/public-plans/quote', 'POST /auth/login', 'POST /auth/mfa/verify', 'POST /auth/refresh', 'POST /auth/logout',
  'POST /auth/verify-email', 'POST /auth/sessions/revoke-others', 'POST /auth/password-reset/validate-code',
  'POST /ceo-onboarding/contract/:contractId/confirm', 'POST /employees/import/confirm', 'POST /employees/import/validate',
  'POST /escalas/assign/preview', 'POST /escalas/requests/preview', 'POST /escalas/requests/:id/cancel', 'POST /escalas/requests/:id/decide', 'POST /escalas/requests/:id/peer',
  'POST /jobs/applications/:id/slot-offers/:offerId/cancel', 'POST /jobs/offers/:offerId/approve', 'POST /jobs/offers/:offerId/return',
  'POST /jobs/offers/:offerId/send', 'POST /jobs/offers/:offerId/cancel', 'POST /jobs/applications/:id/assessments/:inviteId/cancel',
  'POST /public/recruitment/assessment/:token/start', 'POST /public/recruitment/assessment/:token/submit',
  'POST /job-workflow/jobs/:id/decide', 'POST /jobs/applications/:id/hire', 'POST /jobs/applications/:id/forward',
  'POST /management/sst/aso/:id/complete', 'POST /promotions/:id/cancel', 'POST /promotions/apply-due', 'POST /proposals/:id/send',
  'POST /payroll/termination/simulate', 'POST /schedules/assign/preview',
  'POST /auth/password-reset/confirm', 'POST /platform/support/:id/refund/approve', 'POST /platform/support/:id/refund/reject', 'POST /platform/support/tickets/:id/close',
  'POST /support/:id/reopen', 'POST /support/tickets/:id/close', 'POST /support/tickets/:id/reopen', 'POST /users/:id/cancel',
  'POST /time-closing/:id/submit-review', 'POST /time-closing/:id/approve', 'POST /time-closing/:id/close', 'POST /time-closing/:id/reopen',
];
// Criam recurso: continuam 201 de proposito (ou sao do grupo de finance, nao alterado aqui).
const STAY_201 = ['POST /jobs/:id/duplicate', 'POST /communication/messages/send', 'POST /finance/company/checkout', 'POST /faturas/empresa/checkout'];
const ACTION_WORDS = /(\/|^)(login|logout|refresh|simulate|preview|validate|validate-code|quote|cancel|approve|reject|decide|close|reopen|send|submit-review|hire|forward|complete|confirm|apply-due)$/;

function files(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) { if (n !== 'node_modules' && n !== 'dist') files(f, out); }
    else if (n.endsWith('.ts') && !n.endsWith('.spec.ts') && /@Controller\(/.test(readFileSync(f, 'utf8'))) out.push(f);
  }
  return out;
}
const j = (...p: string[]) => '/' + p.flatMap((x) => String(x ?? '').split('/')).filter(Boolean).join('/');

async function postRoutes() {
  const out: { key: string; code?: number }[] = [];
  for (const f of files(SRC)) {
    const mod: Record<string, any> = await import(f);
    for (const c of Object.values(mod)) {
      if (typeof c !== 'function' || Reflect.getMetadata('path', c) === undefined) continue;
      for (const p of Object.getOwnPropertyNames(c.prototype)) {
        const h = c.prototype[p];
        if (typeof h !== 'function' || Reflect.getMetadata('method', h) !== 1) continue;
        out.push({ key: `POST ${j(Reflect.getMetadata('path', c), Reflect.getMetadata('path', h) ?? '')}`, code: Reflect.getMetadata('__httpCode__', h) });
      }
    }
  }
  return out;
}

describe('API-04: POST de consulta/acao responde 200; 201 so quando cria recurso', () => {
  it('toda rota da tabela EXPECT_200 existe e declara @HttpCode(200)', async () => {
    const routes = await postRoutes();
    const bad = EXPECT_200.filter((k) => routes.find((r) => r.key === k)?.code !== 200);
    expect(bad).toEqual([]);
  }, 120000);
  it('rotas de criacao listadas seguem em 201 (sem @HttpCode)', async () => {
    const routes = await postRoutes();
    expect(STAY_201.filter((k) => { const r = routes.find((x) => x.key === k); return !r || r.code !== undefined; })).toEqual([]);
  }, 120000);
  it('nenhum POST cujo ultimo segmento e verbo de acao/consulta fica com 201 por esquecimento', async () => {
    const routes = await postRoutes();
    const skip = new Set([...EXPECT_200, ...STAY_201]);
    const forgotten = routes.filter((r) => r.code === undefined && !skip.has(r.key) && ACTION_WORDS.test(r.key));
    expect(forgotten.map((r) => r.key)).toEqual([]);
  }, 120000);
});
