import { parsePromotion, safePriority, safeTargetUrl } from './notice-rules';

describe('link do aviso', () => {
  it('aceita so caminho interno do sistema', () => {
    expect(safeTargetUrl('/dashboard/vacations')).toBe('/dashboard/vacations');
    expect(safeTargetUrl('/dashboard/escalas?view=ponto')).toBe('/dashboard/escalas?view=ponto');
  });
  it('recusa endereco externo, esquema perigoso e truques de barra', () => {
    for (const bad of ['https://site-falso.com/login', 'http://x.com', '//site-falso.com', 'javascript:alert(1)', '/\\evil.com', '/ok\r\nLocation: x', '', undefined, null]) {
      expect(safeTargetUrl(bad)).toBeUndefined();
    }
  });
});

describe('prioridade do aviso', () => {
  it('aceita as 4 validas (qualquer caixa) e cai no padrao quando invalida', () => {
    expect(safePriority('urgent', 'NORMAL')).toBe('URGENT');
    expect(safePriority('HIGH', 'NORMAL')).toBe('HIGH');
    expect(safePriority('qualquer', 'HIGH')).toBe('HIGH');
    expect(safePriority(undefined, 'NORMAL')).toBe('NORMAL');
  });
});

describe('promocao', () => {
  it('exige novo cargo e/ou novo salario', () => {
    expect(parsePromotion({})).toMatchObject({ ok: false });
    expect(parsePromotion({ newPosition: '   ' })).toMatchObject({ ok: false });
  });
  it('aceita so cargo, so salario, ou os dois, ja limpos', () => {
    expect(parsePromotion({ newPosition: ' Analista Sênior ' })).toEqual({ ok: true, data: { newPosition: 'Analista Sênior' } });
    expect(parsePromotion({ newSalary: 5000 })).toEqual({ ok: true, data: { newSalary: 5000 } });
    expect(parsePromotion({ newPosition: 'Líder', newSalary: '6.500,50', effectiveDate: '2026-11-01' })).toEqual({ ok: true, data: { newPosition: 'Líder', newSalary: 6500.5, effectiveDate: '2026-11-01' } });
  });
  it('salario zero, negativo, texto ou absurdo e recusado', () => {
    for (const newSalary of [0, -100, 'abc', 5_000_000]) expect(parsePromotion({ newPosition: 'X', newSalary })).toMatchObject({ ok: false });
  });
  it('data de vigencia invalida e recusada', () => {
    expect(parsePromotion({ newPosition: 'X', effectiveDate: '31/11/2026' })).toMatchObject({ ok: false });
    expect(parsePromotion({ newPosition: 'X', effectiveDate: '2026-13-45' })).toMatchObject({ ok: false });
  });
});
