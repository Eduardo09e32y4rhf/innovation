import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ceoOnboardingPending } from '../../../apps/web/app/ceo-onboarding/steps';
import { featureAllowed, isFeatureEnabled, type WebFeature } from '../../../apps/web/app/lib/feature-flags';
import { NAV_ITEMS, getSearchDestinations } from '../../../apps/web/app/[tenant]/dashboard/_components/shell-v2/nav-config';
import { visibleAreas, visibleExtras } from '../../../apps/web/app/[tenant]/dashboard/platform/_lib/platform-access';

const ALL: Array<[WebFeature, string]> = [
  ['ai', 'NEXT_PUBLIC_FEATURE_AI'],
  ['partners', 'NEXT_PUBLIC_FEATURE_PARTNERS'],
  ['commercial-sales', 'NEXT_PUBLIC_FEATURE_COMMERCIAL_SALES'],
  ['proposals', 'NEXT_PUBLIC_FEATURE_PROPOSALS'],
  ['manual-contracts', 'NEXT_PUBLIC_FEATURE_MANUAL_CONTRACTS'],
  ['ceo-onboarding', 'NEXT_PUBLIC_FEATURE_CEO_ONBOARDING'],
  ['communication', 'NEXT_PUBLIC_FEATURE_COMMUNICATION'],
  ['promotions', 'NEXT_PUBLIC_FEATURE_PROMOTIONS'],
];

const clearFlags = () => { for (const [, key] of ALL) delete process.env[key]; };
beforeEach(clearFlags);
afterEach(clearFlags);

const on = (...features: WebFeature[]) => { for (const [feature, key] of ALL) if (features.includes(feature)) process.env[key] = 'true'; };
// Áreas do menu da Plataforma + atalhos de módulos congelados (Alertas, Contratos, Propostas, WhatsApp).
const platformKeys = (role = 'DEV') => [...visibleAreas(role).map((area) => area.key), ...visibleExtras(role).map((extra) => extra.key)];
const searchLabels = () => getSearchDestinations(NAV_ITEMS.filter((item) => item.id === 'platform'), 'DEV').map((item) => item.label);

describe('flags do site', () => {
  it('o padrao e DESLIGADO para os 8 modulos', () => {
    for (const [feature] of ALL) expect(isFeatureEnabled(feature)).toBe(false);
  });

  it.each(ALL)('%s liga so com a propria variavel (%s)', (feature, key) => {
    process.env[key] = 'true';
    expect(isFeatureEnabled(feature)).toBe(true);
    for (const [other] of ALL.filter(([name]) => name !== feature)) expect(isFeatureEnabled(other)).toBe(false);
  });

  it('item sem flag sempre aparece; com flag segue a configuracao', () => {
    expect(featureAllowed(undefined)).toBe(true);
    expect(featureAllowed('ai')).toBe(false);
    on('ai');
    expect(featureAllowed('ai')).toBe(true);
  });

  it('le cada variavel NEXT_PUBLIC por extenso (o Next nao troca process.env[chave] no navegador)', () => {
    const source = readFileSync(join(__dirname, '../../../apps/web/app/lib/feature-flags.ts'), 'utf8');
    expect(source).not.toMatch(/process\.env\[/);
    for (const [, key] of ALL) expect(source).toContain(`process.env.${key}`);
  });
});

describe('menu da Plataforma e busca (Ctrl+K) com os modulos congelados', () => {
  it('somem Inteligencia, Contratos, Propostas e WhatsApp, e o resto continua', () => {
    const keys = platformKeys();
    for (const frozen of ['inteligencia', 'contratos', 'propostas', 'whatsapp']) expect(keys).not.toContain(frozen);
    for (const core of ['visao-geral', 'clientes', 'financeiro', 'contabilidade', 'suporte', 'sistema']) expect(keys).toContain(core);
  });

  it('cada item volta com a sua flag', () => {
    on('ai'); expect(platformKeys()).toContain('inteligencia');
    clearFlags(); on('manual-contracts'); expect(platformKeys()).toContain('contratos');
    clearFlags(); on('proposals'); expect(platformKeys()).toContain('propostas');
    clearFlags(); on('communication'); expect(platformKeys()).toContain('whatsapp');
  });

  it('a busca nao oferece Contratos, Propostas, Inteligencia nem WhatsApp', () => {
    const labels = searchLabels();
    for (const frozen of ['Contratos', 'Propostas', 'Inteligência', 'WhatsApp']) expect(labels).not.toContain(frozen);
    for (const core of ['Empresas', 'Financeiro', 'Assinaturas', 'Auditoria', 'Cupons']) expect(labels).toContain(core);
  });

  it('a busca volta a oferecer cada destino com a flag ligada', () => {
    on('proposals', 'manual-contracts', 'ai', 'communication');
    const labels = searchLabels();
    for (const back of ['Contratos', 'Propostas', 'Inteligência', 'WhatsApp']) expect(labels).toContain(back);
  });

  it('o menu lateral principal nao tem item de modulo congelado', () => {
    const ids = NAV_ITEMS.map((item) => item.id);
    for (const frozen of ['partners', 'whatsapp', 'chat', 'promotions', 'proposals', 'contracts', 'ai']) expect(ids).not.toContain(frozen);
  });
});

describe('atalhos de modulos congelados dentro das areas da Plataforma', () => {
  it('Contratos e Propostas (Clientes) somem com os modulos congelados e voltam um a um', () => {
    expect(visibleExtras('DEV', 'clientes')).toEqual([]);
    expect(visibleExtras('COMERCIAL', 'clientes')).toEqual([]);
    on('proposals'); expect(visibleExtras('DEV', 'clientes').map((extra) => extra.key)).toEqual(['propostas']);
    clearFlags(); on('manual-contracts'); expect(visibleExtras('COMERCIAL', 'clientes').map((extra) => extra.key)).toEqual(['contratos']);
  });

  it('"Alertas e riscos" (Visao geral) depende de IA e e so do DEV', () => {
    expect(visibleExtras('DEV', 'visao-geral')).toEqual([]);
    on('ai');
    expect(visibleExtras('DEV', 'visao-geral').map((extra) => extra.key)).toEqual(['inteligencia']);
    expect(visibleExtras('CEO', 'visao-geral')).toEqual([]);
  });
});

describe('onboarding do CEO congelado', () => {
  const ceo = { role: 'CEO', onboardingState: 'CONTRACT_PENDING' as const };

  it('nao redireciona o CEO (senao ele ficaria preso numa pagina inexistente)', () => {
    for (const state of ['INVITED', 'PASSWORD_CHANGE', 'PROFILE_REQUIRED', 'CONTRACT_PENDING'] as const) {
      expect(ceoOnboardingPending({ role: 'CEO', onboardingState: state })).toBe(false);
    }
  });

  it('com a flag ligada volta ao comportamento original', () => {
    on('ceo-onboarding');
    expect(ceoOnboardingPending(ceo)).toBe(true);
    expect(ceoOnboardingPending({ role: 'CEO', onboardingState: 'ACTIVE' })).toBe(false);
    expect(ceoOnboardingPending({ role: 'ADMIN', onboardingState: 'CONTRACT_PENDING' })).toBe(false);
  });
});

describe('FeatureGate e paginas protegidas', () => {
  // O vitest nao compila .tsx (o tsconfig do web usa jsx: preserve): o componente e conferido pelo codigo-fonte,
  // e o comportamento da decisao (flag ligada/desligada) ja e coberto pelos testes de isFeatureEnabled acima.
  const gate = readFileSync(join(__dirname, '../../../apps/web/app/components/feature-gate.tsx'), 'utf8');

  it('FeatureGate so mostra o conteudo quando a flag esta ligada e senao mostra "nao encontrada"', () => {
    expect(gate).toContain('if (isFeatureEnabled(feature)) return <>{children}</>;');
    expect(gate).toContain('Página não encontrada');
    expect(gate).toContain("'use client'");
  });

  const root = join(__dirname, '../../../apps/web/app');
  const layouts: Array<[string, WebFeature]> = [
    ['[tenant]/dashboard/partners/layout.tsx', 'partners'],
    ['[tenant]/dashboard/whatsapp/layout.tsx', 'communication'],
    ['[tenant]/dashboard/chat/layout.tsx', 'communication'],
    ['[tenant]/dashboard/management/promotions/layout.tsx', 'promotions'],
    ['[tenant]/dashboard/platform/whatsapp/layout.tsx', 'communication'],
    ['[tenant]/dashboard/platform/proposals/layout.tsx', 'proposals'],
    ['ceo-onboarding/layout.tsx', 'ceo-onboarding'],
  ];

  it.each(layouts)('a pasta %s esta protegida por FeatureGate (%s)', (file, feature) => {
    expect(readFileSync(join(root, file), 'utf8')).toContain(`<FeatureGate feature="${feature}">`);
  });

  it('o menu de Gestao e os atalhos do painel consultam a flag antes de mostrar Promocoes e Propostas', () => {
    expect(readFileSync(join(root, '[tenant]/dashboard/management/layout.tsx'), 'utf8')).toContain("isFeatureEnabled('promotions')");
    expect(readFileSync(join(root, '[tenant]/dashboard/page.tsx'), 'utf8')).toContain("isFeatureEnabled('proposals')");
    expect(readFileSync(join(root, '[tenant]/dashboard/_components/proposal-gate.tsx'), 'utf8')).toContain("isFeatureEnabled('proposals')");
  });
});
