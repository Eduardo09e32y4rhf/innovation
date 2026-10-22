import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  FICHA_TABS, FINANCEIRO_TABS, PLATFORM_AREAS, SISTEMA_TABS, areaAccess, areaForSegment, areaHref, landingArea, resolveTab, tabAccess, tabsFor,
  visibleAreas, visibleExtras, type AreaKey, type PlatformTab,
} from '../../../apps/web/app/[tenant]/dashboard/platform/_lib/platform-access';
import { backendAllows, loadBackendRoutes, type BackendRoute } from './backend-routes';

const routes = loadBackendRoutes();
const routeFor = (method: string, path: string): BackendRoute => {
  const found = routes.find((route) => route.method === method && route.path === path);
  if (!found) throw new Error(`Rota ${method} ${path} não existe mais no back: atualize as sondas.`);
  return found;
};

type Probe = [string, string];
/** Rotas que cada área/aba chama ao abrir (leitura) e ao alterar (escrita). */
const AREA_PROBES: Record<AreaKey, { read: Probe[]; write: Probe[] }> = {
  'visao-geral': { read: [['GET', '/platform-hub/overview']], write: [] },
  clientes: { read: [['GET', '/platform/companies']], write: [['POST', '/platform/companies'], ['PATCH', '/platform/companies/:id']] },
  financeiro: { read: [['GET', '/faturas/plataforma/summary']], write: [['POST', '/finance/platform/invoices']] },
  contabilidade: { read: [['GET', '/accounting/overview']], write: [['POST', '/accounting/closings/recalculate']] },
  suporte: { read: [['GET', '/platform/support/tickets']], write: [['PATCH', '/platform/support/tickets/:id/status']] },
  sistema: { read: [['GET', '/platform/companies']], write: [['PATCH', '/platform/global-permissions/:role']] },
};

const TAB_PROBES: Record<string, { read: Probe[]; write: Probe[] }> = {
  'clientes.geral': { read: [['GET', '/platform/companies/:id']], write: [['PATCH', '/platform/companies/:id']] },
  'clientes.assinatura': { read: [['GET', '/platform-hub/overview']], write: [['POST', '/faturas/plataforma/companies/:companyId/plan']] },
  'clientes.faturas': { read: [['GET', '/finance/platform/companies/:companyId/invoices']], write: [['POST', '/finance/platform/invoices']] },
  'clientes.usuarios': { read: [['GET', '/platform/company-users/:companyId']], write: [['POST', '/platform/company-users/:companyId'], ['DELETE', '/platform/company-users/:companyId/:userId']] },
  'clientes.documentos': { read: [['GET', '/manual-contracts']], write: [] },
  'clientes.suporte': { read: [['GET', '/platform/support/tickets']], write: [] },
  'clientes.auditoria': { read: [['GET', '/platform/companies/:id/audit-logs']], write: [] },
  'financeiro.faturas': { read: [['GET', '/finance/platform/invoices']], write: [['POST', '/finance/platform/invoices'], ['DELETE', '/finance/platform/invoices/:id']] },
  'financeiro.assinaturas': { read: [['GET', '/platform/plans'], ['GET', '/finance/platform/summary']], write: [['POST', '/finance/platform/companies/:companyId/billing/pause']] },
  'financeiro.planos': { read: [['GET', '/platform/plans']], write: [['POST', '/platform/plans'], ['PATCH', '/platform/plans/:id']] },
  'financeiro.cupons': { read: [['GET', '/coupons']], write: [['POST', '/coupons'], ['PATCH', '/coupons/:id/activate']] },
  'financeiro.reembolsos': { read: [['GET', '/faturas/plataforma/reembolsos']], write: [['POST', '/faturas/plataforma/reembolsos/:ticketId/decidir']] },
  'financeiro.ajustes-fiscais': { read: [['GET', '/finance/fiscal-adjustments']], write: [['POST', '/finance/fiscal-adjustments/:invoiceId/resolve']] },
  'financeiro.relatorio': { read: [['GET', '/finance/platform/reports/monthly']], write: [] },
  'sistema.configuracao': { read: [['GET', '/platform/companies'], ['GET', '/platform/plans']], write: [] },
  'sistema.permissoes': { read: [['GET', '/platform/global-permissions']], write: [['PATCH', '/platform/global-permissions/:role']] },
  'sistema.acessos': { read: [['GET', '/platform/online-users']], write: [] },
  'sistema.auditoria': { read: [['GET', '/platform/companies/:id/audit-logs']], write: [] },
  'sistema.visitas': { read: [['GET', '/platform/visits/summary'], ['GET', '/platform/visits/recent']], write: [] },
};

function refused(probes: Probe[], roleList: readonly string[]): string[] {
  return probes.flatMap(([method, path]) => roleList.filter((role) => !backendAllows(routeFor(method, path), role)).map((role) => `${role} → ${method} ${path} responde 403`));
}

const TABS_BY_AREA: Record<string, PlatformTab[]> = { clientes: FICHA_TABS, financeiro: FINANCEIRO_TABS, sistema: SISTEMA_TABS };

describe('platform-access × @Roles da API: a tela nunca oferece o que o servidor recusa', () => {
  for (const area of PLATFORM_AREAS) {
    it(`área ${area.key}: quem lê e quem altera`, () => {
      expect(refused(AREA_PROBES[area.key].read, area.read)).toEqual([]);
      expect(refused(AREA_PROBES[area.key].write, area.write)).toEqual([]);
    });
    for (const tab of TABS_BY_AREA[area.key] ?? []) {
      it(`aba ${area.key}.${tab.key}`, () => {
        const probes = TAB_PROBES[`${area.key}.${tab.key}`];
        expect(probes, `faltam sondas para ${area.key}.${tab.key}`).toBeDefined();
        expect(refused(probes.read, tab.read)).toEqual([]);
        expect(refused(probes.write, tab.write)).toEqual([]);
      });
    }
  }

  it('toda aba tem sonda e toda sonda de aba existe na lista', () => {
    const declared = Object.entries(TABS_BY_AREA).flatMap(([area, tabs]) => tabs.map((tab) => `${area}.${tab.key}`));
    expect(Object.keys(TAB_PROBES).sort()).toEqual(declared.sort());
  });
});

describe('coerência interna da tabela', () => {
  it('quem altera também lê, em área e em aba', () => {
    for (const rule of [...PLATFORM_AREAS, ...FICHA_TABS, ...FINANCEIRO_TABS, ...SISTEMA_TABS]) for (const role of rule.write) expect(rule.read).toContain(role);
  });
  it('a área aparece no menu para quem abre ao menos uma de suas abas, e as abas nunca excedem a área', () => {
    for (const area of PLATFORM_AREAS.filter((a) => a.tabs)) {
      for (const tab of area.tabs!) for (const role of tab.read) expect(area.read, `${area.key}.${tab.key} para ${role}`).toContain(role);
    }
  });
  it('só existem as 6 áreas pedidas, na ordem do menu', () => {
    expect(PLATFORM_AREAS.map((a) => a.key)).toEqual(['visao-geral', 'clientes', 'financeiro', 'contabilidade', 'suporte', 'sistema']);
  });
});

describe('o que cada perfil vê', () => {
  const keys = (role: string) => visibleAreas(role).map((a) => a.key);
  it('DEV vê as 6 áreas', () => expect(keys('DEV')).toHaveLength(6));
  it('CEO: tudo menos Suporte (a fila da API não aceita CEO); Sistema só para consulta', () => {
    expect(keys('CEO')).toEqual(['visao-geral', 'clientes', 'financeiro', 'contabilidade', 'sistema']);
    expect(areaAccess('sistema', 'CEO')).toBe('read');
    expect(tabsFor(SISTEMA_TABS, 'CEO').map((t) => t.key)).toEqual(['configuracao', 'acessos', 'auditoria']);
  });
  it('COMERCIAL só abre Clientes; CONTABIL abre Financeiro (só leitura) e Contabilidade', () => {
    expect(keys('COMERCIAL')).toEqual(['clientes']);
    expect(keys('CONTABIL')).toEqual(['financeiro', 'contabilidade']);
    expect(areaAccess('financeiro', 'CONTABIL')).toBe('read');
    for (const tab of tabsFor(FINANCEIRO_TABS, 'CONTABIL')) expect(tabAccess(tab, 'CONTABIL')).toBe('read');
    expect(areaAccess('financeiro', 'CEO')).toBe('write');
  });
  it('perfis de empresa não veem nada', () => {
    for (const role of ['ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA', '', undefined]) expect(visibleAreas(role)).toEqual([]);
  });
  it('perfil em minúsculas e com espaços é normalizado', () => expect(areaAccess('clientes', ' comercial ')).toBe('write'));
  it('quem não tem a Visão geral cai na primeira área permitida', () => {
    expect(landingArea('COMERCIAL')?.key).toBe('clientes');
    expect(landingArea('CONTABIL')?.key).toBe('financeiro');
    expect(landingArea('ADMIN')).toBeUndefined();
  });
  it('ficha do cliente tem 7 abas fixas; Suporte some para o CEO por causa da API', () => {
    expect(FICHA_TABS.map((t) => t.label)).toEqual(['Geral', 'Assinatura', 'Faturas', 'Usuários', 'Documentos', 'Suporte', 'Auditoria']);
    expect(tabsFor(FICHA_TABS, 'COMERCIAL')).toHaveLength(7);
    expect(tabsFor(FICHA_TABS, 'CEO').map((t) => t.key)).not.toContain('suporte');
  });
  it('Financeiro tem as 7 abas na ordem pedida', () => {
    expect(FINANCEIRO_TABS.map((t) => t.label)).toEqual(['Faturas', 'Assinaturas', 'Planos', 'Cupons', 'Reembolsos', 'Ajustes fiscais', 'Relatório']);
  });
  it('?aba= inválida ou não permitida cai na primeira aba do perfil', () => {
    expect(resolveTab(SISTEMA_TABS, 'permissoes', 'DEV')?.key).toBe('permissoes');
    expect(resolveTab(SISTEMA_TABS, 'permissoes', 'CEO')?.key).toBe('configuracao');
    expect(resolveTab(SISTEMA_TABS, 'xyz', 'DEV')?.key).toBe('configuracao');
    expect(resolveTab(SISTEMA_TABS, 'visitas', 'COMERCIAL')).toBeUndefined();
  });
  it('endereços e áreas por caminho', () => {
    const contab = PLATFORM_AREAS.find((a) => a.key === 'contabilidade')!;
    expect(areaHref('acme', contab)).toBe('/acme/dashboard/contabilidade');
    expect(areaHref('acme', PLATFORM_AREAS[0])).toBe('/acme/dashboard/platform');
    expect(areaHref('acme', PLATFORM_AREAS[2])).toBe('/acme/dashboard/platform/financeiro');
    expect(areaForSegment('/clientes/abc')?.key).toBe('clientes');
    expect(areaForSegment('/proposals/new')?.key).toBe('clientes');
    expect(areaForSegment('')?.key).toBe('visao-geral');
    expect(areaForSegment('/inexistente')).toBeUndefined();
  });
});

describe('módulos congelados por flag', () => {
  const FLAGS = ['NEXT_PUBLIC_FEATURE_AI', 'NEXT_PUBLIC_FEATURE_PROPOSALS', 'NEXT_PUBLIC_FEATURE_MANUAL_CONTRACTS', 'NEXT_PUBLIC_FEATURE_COMMUNICATION'];
  afterEach(() => { for (const key of FLAGS) delete process.env[key]; });
  it('com tudo desligado não há atalho de Alertas, Contratos, Propostas nem WhatsApp', () => {
    expect(visibleExtras('DEV')).toEqual([]);
  });
  it('cada atalho volta com a sua flag e só para os perfis certos', () => {
    process.env.NEXT_PUBLIC_FEATURE_AI = 'true';
    expect(visibleExtras('DEV', 'visao-geral').map((e) => e.key)).toEqual(['inteligencia']);
    expect(visibleExtras('CEO', 'visao-geral')).toEqual([]);
    process.env.NEXT_PUBLIC_FEATURE_MANUAL_CONTRACTS = 'true';
    process.env.NEXT_PUBLIC_FEATURE_PROPOSALS = 'true';
    expect(visibleExtras('COMERCIAL', 'clientes').map((e) => e.key)).toEqual(['contratos', 'propostas']);
    process.env.NEXT_PUBLIC_FEATURE_COMMUNICATION = 'true';
    expect(visibleExtras('DEV', 'sistema').map((e) => e.key)).toEqual(['whatsapp']);
  });
});

describe('uma só fonte de permissão', () => {
  const root = join(__dirname, '../../../apps/web/app/[tenant]/dashboard');
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(tsx?|js)$/.test(name) ? [full] : [];
  });
  const files = [...walk(join(root, 'platform')), ...walk(join(root, 'faturas'))];
  it('não restam TAB_POLICY, lista "specialist" nem menu paralelo', () => {
    for (const file of files) {
      if (file.endsWith('platform-access.ts')) continue;
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/TAB_POLICY|specialist|PLATFORM_NAV_GROUPS|getPlatformNavGroups/);
    }
  });
  it('o layout e o menu leem platform-access e não repetem listas de perfis', () => {
    for (const name of ['layout.tsx', '_components/platform-sidebar.tsx']) {
      const source = readFileSync(join(root, 'platform', name), 'utf8');
      expect(source).toContain('platform-access');
      expect(source).not.toMatch(/'(DEV|CEO|COMERCIAL|CONTABIL)'/);
    }
  });
  it('nenhum arquivo da Plataforma passa de 300 linhas', () => {
    const grandes = files.filter((f) => readFileSync(f, 'utf8').split('\n').length > 300);
    expect(grandes).toEqual([]);
  });
});
