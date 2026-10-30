import 'reflect-metadata';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * SEG-09, camada 1: JwtAuthGuard e RolesGuard nao sao globais, entao todo controller precisa declarar o guard.
 * Este teste carrega TODOS os controllers de apps/api/src e falha se uma rota nao tiver JwtAuthGuard (no metodo
 * ou na classe) e nao estiver na lista abaixo, que e a lista de rotas publicas conhecidas
 * (docs/auditoria/01a-endpoints.md e 01b: 19 + 22 publicas e as 15 com guard/token proprio).
 * Ao criar uma rota publica de proposito, adicione-a aqui COM justificativa.
 */
const SRC = join(__dirname, '../../apps/api/src');

type Allowed = { why: string; ownGuard?: string };
const PUBLICA = (why: string): Allowed => ({ why });
const GUARD_PROPRIO = (guard: string, why: string): Allowed => ({ why, ownGuard: guard });

const ALLOWED: Record<string, Allowed> = {
  // infra
  // MetricsController declara a rota na raiz; o PrometheusModule a monta em /metrics (inventario: GET /metrics)
  'GET /': PUBLICA('Prometheus (/metrics); autenticacao propria por token (timingSafeEqual) dentro do controller'),
  'GET /health': PUBLICA('liveness/readiness para o orquestrador'),
  'GET /health/live': PUBLICA('liveness'),
  'GET /health/ready': PUBLICA('readiness'),
  // auth
  'GET /auth/public-plans': PUBLICA('catalogo de planos da pagina de cadastro'),
  'POST /auth/public-plans/quote': PUBLICA('cotacao publica de plano'),
  'POST /auth/register-company': PUBLICA('cadastro/trial; Turnstile + limite por IP'),
  'POST /auth/login': PUBLICA('login; Turnstile + limite por conta e IP'),
  'POST /auth/mfa/verify': PUBLICA('2a etapa do login (usa token de desafio MFA)'),
  'POST /auth/refresh': PUBLICA('troca o refresh token em cookie httpOnly'),
  'POST /auth/logout': PUBLICA('revoga o refresh token do cookie'),
  'POST /auth/verify-email': PUBLICA('confirmacao por token assinado'),
  'POST /auth/password-reset/request': PUBLICA('pedido de recuperacao; resposta uniforme, Turnstile'),
  'POST /auth/password-reset/validate-code': PUBLICA('valida codigo emitido pelo RH; 5 tentativas'),
  'POST /auth/password-reset/confirm': PUBLICA('confirma com token de uso unico'),
  // webhooks (autenticados por assinatura/token do provedor dentro do controller)
  'POST /finance/webhook/asaas': PUBLICA('webhook Asaas; token do provedor; limite por IP'),
  'POST /finance/webhook/mercadopago': PUBLICA('webhook Mercado Pago; assinatura x-signature; limite por IP'),
  // suporte publico
  'POST /support/public/tickets': GUARD_PROPRIO('TurnstileOptionalGuard', 'suporte na tela de login; honeypot + 5/min por IP; Turnstile se o token for enviado'),
  'POST /support/public/password-reset': GUARD_PROPRIO('TurnstileOptionalGuard', 'pedido de ajuda de senha; honeypot + 5/min por IP; Turnstile se o token for enviado'),
  // analytics / vagas / candidatos
  'POST /public/visits': PUBLICA('contagem de visitas anonima; limite proprio'),
  'POST /candidate-portal/auth/reset-password': PUBLICA('codigo de 6 digitos com hash e tentativas'),
  'GET /public/candidate-documents/:token': PUBLICA('link com token de uso do candidato'),
  'POST /public/candidate-documents/:token/upload': PUBLICA('link com token de uso do candidato'),
  'POST /public/candidate-documents/:token/code': PUBLICA('link com token de uso do candidato; envia o codigo ao e-mail do candidato'),
  'POST /public/candidate-documents/:token/verify': PUBLICA('link com token de uso do candidato; confirma o codigo recebido por e-mail'),
  'POST /public/candidate-requests': PUBLICA('pedido LGPD do candidato; Turnstile + limite por IP; so envia link de confirmacao ao e-mail (RS-C-01)'),
  'POST /public/consents/confirm': PUBLICA('confirma o banco de talentos pelo link do recibo; token de 64 hex (hash no banco); limite por IP (RS-C-18)'),
  'POST /public/consents/revoke': PUBLICA('revoga consentimento pelo link do recibo; token de 64 hex (hash no banco); limite por IP (RS-D-06)'),
  'POST /public/candidate-requests/confirm': PUBLICA('confirmacao do titular por token de uso unico (hash) recebido no e-mail; limite por IP (RS-C-01)'),
  'GET /public/candidate-status/:token': PUBLICA('status por token'),
  'GET /public/internal-jobs/:jobId': PUBLICA('vaga interna por link'),
  'GET /public/jobs': PUBLICA('vagas publicadas'),
  'GET /public/jobs/:jobId': PUBLICA('vaga publicada'),
  'GET /public/jobs/company/:companyKey': PUBLICA('vagas da empresa'),
  'GET /public/jobs/company/:companyKey/feed.xml': PUBLICA('feed de vagas abertas para portais (mesmas regras da lista publica); limite por IP (RS-R-06)'),
  'GET /public/jobs/company/:companyKey/feed.json': PUBLICA('feed JSON de vagas abertas; mesmas regras da lista publica; limite por IP (RS-R-06)'),
  'GET /public/recruitment/assessment/:token': PUBLICA('link com token do candidato'),
  'POST /public/recruitment/assessment/:token/start': PUBLICA('link com token do candidato'),
  'POST /public/recruitment/assessment/:token/submit': PUBLICA('link com token do candidato'),
  'GET /public/recruitment/interview/:token': PUBLICA('link com token do candidato'),
  'POST /public/recruitment/interview/:token': PUBLICA('link com token do candidato'),
  'GET /public/recruitment/offer/:token': PUBLICA('link com token do candidato'),
  'POST /public/recruitment/offer/:token': PUBLICA('link com token do candidato'),
  'GET /public/recruitment/slots/:token': PUBLICA('link com token do candidato'),
  'POST /public/recruitment/slots/:token': PUBLICA('link com token do candidato'),
  // guard/token proprio (candidato nao e usuario do sistema)
  'POST /candidate-portal/auth/register': GUARD_PROPRIO('TurnstileGuard', 'cadastro do candidato'),
  'POST /candidate-portal/auth/login': GUARD_PROPRIO('TurnstileGuard', 'login do candidato'),
  'POST /candidate-portal/auth/forgot-password': GUARD_PROPRIO('TurnstileGuard', 'esqueci a senha do candidato'),
  'POST /public/jobs/:jobId/apply': GUARD_PROPRIO('TurnstileGuard', 'candidatura externa'),
  'POST /public/internal-jobs/:jobId/apply': GUARD_PROPRIO('TurnstileGuard', 'candidatura interna'),
  'GET /candidate-portal/consents': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
  'POST /candidate-portal/consents/:id/revoke': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
  'POST /candidate-portal/auth/logout': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
  'POST /candidate-portal/auth/verify-email': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
  'POST /candidate-portal/auth/resend-verification': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
  'GET /candidate-portal/me': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
  'PUT /candidate-portal/me': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
  'PUT /candidate-portal/me/resume': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
  'DELETE /candidate-portal/me': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
  'GET /candidate-portal/cep/:cep': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
  'GET /candidate-portal/applications': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
  'GET /candidate-portal/invites': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
  'POST /candidate-portal/invites/:inviteId/decline': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
  'POST /candidate-portal/jobs/:jobId/apply': GUARD_PROPRIO('CandidateAuthGuard', 'sessao do candidato'),
};

/**
 * Camada 2 (SEG-09, aplicada): o RolesGuard nega por padrao. Rota com login precisa de @Roles(...) ou @AnyAuthenticated();
 * rota publica e a listada em ALLOWED (sem JwtAuthGuard). As 20 rotas abaixo sao "so logado" de proposito
 * (10 com RolesGuard: notificacoes do proprio usuario, empresa propria, permissoes proprias; 10 de autosservico em /auth).
 */
const LOGGED_IN_ONLY = new Set([
  'GET /companies/me',
  'GET /faturas/permissoes/minhas',
  'GET /notifications',
  'GET /notifications/unread-count',
  'PATCH /notifications/:id/read',
  'PATCH /notifications/read-all',
  'PATCH /notifications/:id/archive',
  'DELETE /notifications/:id',
  'PATCH /notifications/:id/respond',
  'GET /notifications/dashboard-widget',
  'POST /auth/resend-verification',
  'GET /auth/sessions',
  'POST /auth/sessions/revoke-others',
  'DELETE /auth/sessions/:id',
  'GET /auth/mfa/status',
  'POST /auth/mfa/setup',
  'POST /auth/mfa/enable',
  'POST /auth/mfa/disable',
  'POST /auth/change-password',
  'GET /auth/me',
]);

function controllerFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (name !== 'node_modules' && name !== 'dist') controllerFiles(full, out); }
    else if (name.endsWith('.ts') && !name.endsWith('.spec.ts') && !name.endsWith('.d.ts') && /@Controller\(/.test(readFileSync(full, 'utf8'))) out.push(full);
  }
  return out;
}

const join2 = (...parts: string[]) => '/' + parts.flatMap((p) => String(p ?? '').split('/')).filter(Boolean).join('/');
const METHODS: Record<number, string> = { 0: 'GET', 1: 'POST', 2: 'PUT', 3: 'DELETE', 4: 'PATCH', 5: 'ALL', 6: 'OPTIONS', 7: 'HEAD' };
const guardNames = (target: object): string[] => ((Reflect.getMetadata('__guards__', target) as any[]) ?? []).map((g) => g?.name ?? String(g));

interface RouteInfo { key: string; file: string; guards: string[]; roles: unknown; anyAuth: boolean }

async function collect(): Promise<{ routes: RouteInfo[]; controllers: string[]; unloadable: string[] }> {
  const routes: RouteInfo[] = [];
  const controllers: string[] = [];
  const unloadable: string[] = [];
  for (const file of controllerFiles(SRC)) {
    const mod: Record<string, any> = await import(file);
    let found = false;
    for (const exported of Object.values(mod)) {
      if (typeof exported !== 'function' || Reflect.getMetadata('path', exported) === undefined) continue;
      found = true;
      controllers.push(`${relative(SRC, file)}#${exported.name}`);
      const base = Reflect.getMetadata('path', exported);
      const classGuards = guardNames(exported);
      for (const prop of Object.getOwnPropertyNames(exported.prototype)) {
        const handler = exported.prototype[prop];
        if (typeof handler !== 'function' || prop === 'constructor') continue;
        const method = Reflect.getMetadata('method', handler);
        if (method === undefined) continue;
        const paths: string[] = [].concat(Reflect.getMetadata('path', handler) ?? '');
        for (const p of paths) {
          routes.push({ key: `${METHODS[method] ?? method} ${join2(base, p)}`, file: relative(SRC, file), guards: [...classGuards, ...guardNames(handler)], roles: Reflect.getMetadata('roles', handler) ?? Reflect.getMetadata('roles', exported), anyAuth: Boolean(Reflect.getMetadata('anyAuthenticated', handler) ?? Reflect.getMetadata('anyAuthenticated', exported)) });
        }
      }
    }
    if (!found) unloadable.push(relative(SRC, file));
  }
  return { routes, controllers, unloadable };
}

describe('SEG-09: todo controller declara JwtAuthGuard ou esta na lista de excecoes publicas justificadas', () => {
  it('nenhuma rota fica aberta por esquecimento; a lista de excecoes nao tem entradas velhas', async () => {
    const { routes, controllers, unloadable } = await collect();
    expect(unloadable, 'arquivo com @Controller sem classe exportada reconhecida').toEqual([]);
    expect(controllers.length).toBeGreaterThan(60);
    expect(routes.length).toBeGreaterThan(400);

    const open = routes.filter((r) => !r.guards.includes('JwtAuthGuard'));
    const unexpected = open.filter((r) => !ALLOWED[r.key]).map((r) => `${r.key}  (${r.file})`);
    expect(unexpected, 'rota SEM JwtAuthGuard fora da lista de excecoes publicas (adicione o guard ou justifique em ALLOWED)').toEqual([]);

    const openKeys = new Set(open.map((r) => r.key));
    const stale = Object.keys(ALLOWED).filter((k) => !openKeys.has(k));
    expect(stale, 'excecao que ja nao existe ou agora tem JwtAuthGuard: remova de ALLOWED').toEqual([]);

    for (const r of open) {
      const rule = ALLOWED[r.key];
      if (rule?.ownGuard) expect(r.guards, `${r.key} deve declarar ${rule.ownGuard}`).toContain(rule.ownGuard);
      expect(rule?.why.length, `${r.key} sem justificativa`).toBeGreaterThan(5);
    }
  }, 120000);

  it('TODA rota tem uma das tres marcas: @Roles, @AnyAuthenticated ou publica declarada (ALLOWED)', async () => {
    const { routes } = await collect();
    const sem = routes.filter((r) => r.guards.includes('JwtAuthGuard') && !(r.roles as any[] | undefined)?.length && !r.anyAuth).map((r) => `${r.key} (${r.file})`);
    expect(sem, 'rota com login sem @Roles e sem @AnyAuthenticated: o RolesGuard responderia 403').toEqual([]);
    const semGuardNemLista = routes.filter((r) => !r.guards.includes('JwtAuthGuard') && !ALLOWED[r.key]).map((r) => r.key);
    expect(semGuardNemLista).toEqual([]);
  }, 120000);

  it('@AnyAuthenticated so nas rotas "so logado" conhecidas (nao vira atalho para esquecer @Roles)', async () => {
    const { routes } = await collect();
    const marcadas = routes.filter((r) => r.anyAuth && !(r.roles as any[] | undefined)?.length).map((r) => r.key);
    expect(marcadas.filter((k) => !LOGGED_IN_ONLY.has(k)), 'rota com @AnyAuthenticated fora de LOGGED_IN_ONLY').toEqual([]);
    expect([...LOGGED_IN_ONLY].filter((k) => !marcadas.includes(k)), 'excecao velha em LOGGED_IN_ONLY').toEqual([]);
  }, 120000);

  it('a lista cobre as rotas publicas do inventario da auditoria (01a: 19 publicas, 01b: 22)', () => {
    const csv = (f: string) => readFileSync(join(__dirname, '../../docs/auditoria', f), 'utf8').split('\n').slice(1).filter(Boolean)
      .map((l) => l.split(';').map((c) => c.replace(/^"|"$/g, '')));
    const publicas = [...csv('01a-endpoints.csv'), ...csv('01b-endpoints.csv')].filter((c) => c[4] === 'PUBLICO');
    expect(publicas.length).toBe(19 + 22);
    const alias: Record<string, string> = { 'GET /metrics': 'GET /' };
    const faltando = publicas.map((c) => `${c[1]} ${c[2]}`).map((k) => alias[k] ?? k).filter((k) => !ALLOWED[k]);
    expect(faltando).toEqual([]);
  });
});
