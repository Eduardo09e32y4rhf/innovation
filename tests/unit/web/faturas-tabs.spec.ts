import { describe, expect, it } from 'vitest';
import { resolveFaturasTab, visibleFaturasTabs } from '../../../apps/web/app/[tenant]/dashboard/faturas/_tabs';

describe('abas de Faturas (visao da plataforma)', () => {
  it('DEV e CEO veem tudo; CONTABIL tambem; COMERCIAL nao ve Cupons', () => {
    expect(visibleFaturasTabs('DEV')).toEqual(['faturas', 'assinaturas', 'planos', 'cupons']);
    expect(visibleFaturasTabs('CEO')).toEqual(['faturas', 'assinaturas', 'planos', 'cupons']);
    expect(visibleFaturasTabs('CONTABIL')).toEqual(['faturas', 'assinaturas', 'planos', 'cupons']);
    expect(visibleFaturasTabs('COMERCIAL')).toEqual(['faturas', 'assinaturas', 'planos']);
  });
  it('perfis de empresa nao veem nenhuma aba da plataforma', () => {
    for (const role of ['ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA', '', undefined]) expect(visibleFaturasTabs(role)).toEqual([]);
  });
  it('?aba= so vale se permitida; senao cai na primeira', () => {
    expect(resolveFaturasTab('planos', 'COMERCIAL')).toBe('planos');
    expect(resolveFaturasTab('cupons', 'COMERCIAL')).toBe('faturas');
    expect(resolveFaturasTab('inexistente', 'DEV')).toBe('faturas');
    expect(resolveFaturasTab(null, 'DEV')).toBe('faturas');
    expect(resolveFaturasTab('cupons', 'dev')).toBe('cupons');
  });
});