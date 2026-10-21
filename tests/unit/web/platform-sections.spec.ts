import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveSub, subsFor } from '../../../apps/web/app/[tenant]/dashboard/platform/_hub/sections';

// Alertas (IA), Contratos e Propostas sao modulos congelados (padrao); estes testes cobrem as subsecoes com eles ligados.
// O caso "congelado" esta em frozen-features.spec.ts.
const FLAGS = ['NEXT_PUBLIC_FEATURE_AI', 'NEXT_PUBLIC_FEATURE_PROPOSALS', 'NEXT_PUBLIC_FEATURE_MANUAL_CONTRACTS'];
beforeEach(() => { for (const key of FLAGS) process.env[key] = 'true'; });
afterEach(() => { for (const key of FLAGS) delete process.env[key]; });

describe('subsecoes da Plataforma', () => {
  it('Comercial: DEV e COMERCIAL veem contratos e propostas; CEO e CONTABIL nenhuma', () => {
    expect(subsFor('comercial', 'DEV').map((s) => s.key)).toEqual(['contratos', 'propostas']);
    expect(subsFor('comercial', 'COMERCIAL').map((s) => s.key)).toEqual(['contratos', 'propostas']);
    expect(subsFor('comercial', 'CEO')).toEqual([]);
    expect(subsFor('comercial', 'CONTABIL')).toEqual([]);
  });
  it('Configuracoes so para DEV; Resumo: alertas so DEV e COMERCIAL', () => {
    expect(subsFor('configuracoes', 'DEV').map((s) => s.key)).toEqual(['global', 'permissoes', 'acessos']);
    // Quem tinha Configuracao/Acessos no menu antigo continua com acesso (CEO: global + acessos; COMERCIAL: acessos).
    expect(subsFor('configuracoes', 'CEO').map((s) => s.key)).toEqual(['global', 'acessos']);
    expect(subsFor('configuracoes', 'COMERCIAL').map((s) => s.key)).toEqual(['acessos']);
    for (const role of ['CONTABIL', 'ADMIN', 'RH_RS']) expect(subsFor('configuracoes', role)).toEqual([]);
    expect(subsFor('resumo', 'DEV').map((s) => s.key)).toEqual(['visao', 'alertas']);
    expect(subsFor('resumo', 'CEO').map((s) => s.key)).toEqual(['visao']);
  });
  it('?sub= invalida ou nao permitida cai na primeira; aba sem subsecoes devolve undefined', () => {
    expect(resolveSub('comercial', 'propostas', 'DEV')).toBe('propostas');
    expect(resolveSub('comercial', 'xyz', 'DEV')).toBe('contratos');
    expect(resolveSub('resumo', 'alertas', 'CEO')).toBe('visao');
    expect(resolveSub('suporte', 'qualquer', 'DEV')).toBeUndefined();
    expect(resolveSub('configuracoes', null, 'dev')).toBe('global');
  });
});