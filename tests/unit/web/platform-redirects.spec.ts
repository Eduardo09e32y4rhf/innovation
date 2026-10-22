import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const requireFromRoot = createRequire(join(__dirname, '../../../package.json'));
const { match, compile } = requireFromRoot('next/dist/compiled/path-to-regexp') as {
  match: (path: string, options: { decode: (text: string) => string }) => (url: string) => false | { params: Record<string, string> };
  compile: (path: string) => (params: Record<string, string>) => string;
};
const nextConfig = requireFromRoot(join(__dirname, '../../../apps/web/next.config.js')) as { redirects: () => Promise<Rule[]> };

interface Rule { source: string; destination: string; permanent: boolean; has?: Array<{ type: string; key: string; value?: string }> }

const UUID = '11111111-2222-4333-8444-555555555555';
let rules: Rule[] = [];

/** Simula o redirecionamento do Next: caminho + parâmetros de query (`has`) -> endereço novo. */
function resolve(url: string): string | null {
  const [path, queryText = ''] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryText));
  for (const rule of rules) {
    const hit = match(rule.source, { decode: decodeURIComponent })(path);
    if (!hit) continue;
    const params: Record<string, string> = { ...hit.params };
    let ok = true;
    for (const condition of rule.has ?? []) {
      const found = query[condition.key];
      const result = found === undefined ? null : new RegExp(`^${condition.value ?? '.*'}$`).exec(found);
      if (!result) { ok = false; break; }
      Object.assign(params, result.groups ?? {});
    }
    if (!ok) continue;
    const [destPath, destQuery] = rule.destination.split('?');
    const fill = (text: string) => text.replace(/:([A-Za-z_]+)/g, (_, key: string) => encodeURIComponent(params[key] ?? ''));
    return compile(destPath)(params) + (destQuery ? `?${fill(destQuery)}` : '');
  }
  return null;
}

const P = '/acme/dashboard/platform';
const CASES: Array<[string, string]> = [
  // hub antigo (?tab= / ?sub=)
  [`${P}?tab=empresas`, `${P}/clientes`],
  [`${P}?tab=dossie&sub=users&company=${UUID}`, `${P}/clientes/${UUID}?aba=usuarios`],
  [`${P}?tab=dossie&sub=general&company=${UUID}`, `${P}/clientes/${UUID}?aba=geral`],
  [`${P}?tab=dossie&sub=subscription&company=${UUID}`, `${P}/clientes/${UUID}?aba=assinatura`],
  [`${P}?tab=dossie&sub=finance&company=${UUID}`, `${P}/clientes/${UUID}?aba=faturas`],
  [`${P}?tab=dossie&sub=documents&company=${UUID}`, `${P}/clientes/${UUID}?aba=documentos`],
  [`${P}?tab=dossie&sub=support&company=${UUID}`, `${P}/clientes/${UUID}?aba=suporte`],
  [`${P}?tab=dossie&sub=logs&company=${UUID}`, `${P}/clientes/${UUID}?aba=auditoria`],
  [`${P}?tab=dossie&company=${UUID}`, `${P}/clientes/${UUID}?aba=geral`],
  [`${P}?tab=resumo&company=${UUID}`, `${P}/clientes/${UUID}?aba=geral`],
  [`${P}?company=${UUID}`, `${P}/clientes/${UUID}?aba=geral`],
  [`${P}?tab=comercial&sub=contratos`, `${P}/clientes/contratos`],
  [`${P}?tab=comercial&sub=propostas`, `${P}/clientes/propostas`],
  [`${P}?tab=comercial`, `${P}/clientes/contratos`],
  [`${P}?tab=contabilidade`, '/acme/dashboard/contabilidade'],
  [`${P}?tab=financeiro`, `${P}/financeiro?aba=faturas`],
  [`${P}?tab=suporte`, `${P}/suporte`],
  [`${P}?tab=suporte&company=${UUID}`, `${P}/suporte?companyId=${UUID}`],
  [`${P}?tab=auditoria`, `${P}/sistema?aba=auditoria`],
  [`${P}?tab=auditoria&company=${UUID}`, `${P}/sistema?aba=auditoria&empresa=${UUID}`],
  [`${P}?tab=configuracoes&sub=global`, `${P}/sistema?aba=configuracao`],
  [`${P}?tab=configuracoes`, `${P}/sistema?aba=configuracao`],
  [`${P}?tab=configuracoes&sub=permissoes`, `${P}/sistema?aba=permissoes`],
  [`${P}?tab=configuracoes&sub=acessos`, `${P}/sistema?aba=acessos`],
  // páginas soltas
  [`${P}/companies`, `${P}/clientes`],
  [`${P}/intelligence`, P],
  [`${P}/audit`, `${P}/sistema?aba=auditoria`],
  [`${P}/support`, `${P}/suporte`],
  [`${P}/permissions`, `${P}/sistema?aba=permissoes`],
  [`${P}/access`, `${P}/sistema?aba=acessos`],
  [`${P}/configuration`, `${P}/sistema?aba=configuracao`],
  [`${P}/visitas`, `${P}/sistema?aba=visitas`],
  [`${P}/contracts`, `${P}/clientes/contratos`],
  [`${P}/proposals`, `${P}/clientes/propostas`],
  [`${P}/accounting`, '/acme/dashboard/contabilidade'],
  [`${P}/finance`, `${P}/financeiro?aba=faturas`],
  [`${P}/finance?search=Acme`, `${P}/financeiro?aba=faturas&q=Acme`],
  [`${P}/plans`, `${P}/financeiro?aba=planos`],
  [`${P}/coupons`, `${P}/financeiro?aba=cupons`],
  [`${P}/subscriptions`, `${P}/financeiro?aba=assinaturas`],
  [`${P}/${UUID}`, `${P}/clientes/${UUID}?aba=geral`],
  [`${P}/${UUID}?tab=users`, `${P}/clientes/${UUID}?aba=usuarios`],
  [`${P}/${UUID}?tab=logs`, `${P}/clientes/${UUID}?aba=auditoria`],
  // abas da plataforma que viviam em Faturas
  ['/acme/dashboard/faturas?aba=planos', `${P}/financeiro?aba=planos`],
  ['/acme/dashboard/faturas?aba=cupons', `${P}/financeiro?aba=cupons`],
  ['/acme/dashboard/faturas?aba=assinaturas', `${P}/financeiro?aba=assinaturas`],
  ['/acme/dashboard/faturas?aba=reembolsos', `${P}/financeiro?aba=reembolsos`],
  ['/acme/dashboard/faturas?aba=ajustes-fiscais', `${P}/financeiro?aba=ajustes-fiscais`],
  ['/acme/dashboard/faturas?aba=faturas', `${P}/financeiro?aba=faturas`],
  ['/acme/dashboard/faturas?q=Acme', `${P}/financeiro?aba=faturas&q=Acme`],
];

describe('redirecionamentos permanentes das URLs antigas da Plataforma', async () => {
  rules = await nextConfig.redirects();

  it.each(CASES)('%s -> %s', (from, to) => expect(resolve(from)).toBe(to));

  it('a tela de faturas da empresa e as páginas novas não são redirecionadas', () => {
    for (const url of ['/acme/dashboard/faturas', `${P}`, `${P}/clientes`, `${P}/clientes/${UUID}`, `${P}/financeiro?aba=planos`, `${P}/sistema`, `${P}/suporte`, `${P}/proposals/new`, `${P}/proposals/abc`, `${P}/whatsapp`]) {
      expect(resolve(url), url).toBeNull();
    }
  });

  it('todos são permanentes', () => expect(rules.every((rule) => rule.permanent === true)).toBe(true));

  it('todo destino aponta para uma página que existe', () => {
    const app = join(__dirname, '../../../apps/web/app/[tenant]/dashboard');
    for (const rule of rules) {
      const path = rule.destination.split('?')[0].replace('/:tenant/dashboard', '');
      const dir = path.split('/').filter(Boolean).map((part) => (part.startsWith(':') ? '[companyId]' : part)).join('/');
      expect(existsSync(join(app, dir, 'page.tsx')), `${rule.source} -> ${rule.destination}`).toBe(true);
    }
  });

  it('nenhuma origem sem condição esconde uma página que ainda existe', () => {
    const app = join(__dirname, '../../../apps/web/app/[tenant]/dashboard');
    for (const rule of rules.filter((r) => !r.has)) {
      const dir = rule.source.replace('/:tenant/dashboard', '').split('/').filter(Boolean).map((part) => (part.startsWith(':') ? '[companyId]' : part)).join('/');
      expect(existsSync(join(app, dir, 'page.tsx')), rule.source).toBe(false);
    }
  });
});
