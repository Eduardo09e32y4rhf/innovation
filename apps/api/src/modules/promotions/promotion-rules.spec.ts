import { describe, expect, it } from 'vitest';
import { checkPromotion, DEFAULT_POLICY, monthsBetween, promotionMessage, validatePolicy, type PromotionPolicyLike } from './promotion-rules';

const policy = (over: Partial<PromotionPolicyLike> = {}): PromotionPolicyLike => ({ ...DEFAULT_POLICY, ...over });
const ana = { position: 'Analista', salary: 3000, admissionDate: '2024-01-15' };
const HOJE = '2026-10-12';

describe('promoção: o que é recusado', () => {
  it('sem cargo nem salário', () => expect(checkPromotion(policy(), ana, { effectiveDate: HOJE, reason: 'mérito' }, HOJE)).toMatch(/novo cargo/));
  it('sem data', () => expect(checkPromotion(policy(), ana, { newPosition: 'Sênior', effectiveDate: '', reason: 'mérito' }, HOJE)).toMatch(/data/));
  it('vigência mais de 31 dias no passado', () => expect(checkPromotion(policy(), ana, { newPosition: 'Sênior', effectiveDate: '2026-08-01', reason: 'mérito' }, HOJE)).toMatch(/31 dias/));
  it('vigência a mais de 1 ano', () => expect(checkPromotion(policy(), ana, { newPosition: 'Sênior', effectiveDate: '2028-01-01', reason: 'mérito' }, HOJE)).toMatch(/1 ano/));
  it('salário menor que o atual', () => expect(checkPromotion(policy(), ana, { newSalary: 2500, effectiveDate: HOJE, reason: 'mérito' }, HOJE)).toMatch(/menor/));
  it('salário igual ao atual sem trocar cargo', () => expect(checkPromotion(policy(), ana, { newSalary: 3000, effectiveDate: HOJE, reason: 'mérito' }, HOJE)).toMatch(/igual/));
  it('cargo igual ao atual sem mudar salário (ignora acento e caixa)', () => expect(checkPromotion(policy(), ana, { newPosition: 'ANALISTA', effectiveDate: HOJE, reason: 'mérito' }, HOJE)).toMatch(/igual/));
  it('exige motivo quando a regra pede', () => expect(checkPromotion(policy(), ana, { newPosition: 'Sênior', effectiveDate: HOJE }, HOJE)).toMatch(/motivo/));
});

describe('promoção: regras definidas pela empresa', () => {
  it('limite de aumento: 10% de 3.000 = 3.300 passa, 3.301 não', () => {
    const p = policy({ maxRaisePercent: 10 });
    expect(checkPromotion(p, ana, { newSalary: 3300, effectiveDate: HOJE, reason: 'mérito' }, HOJE)).toBeNull();
    expect(checkPromotion(p, ana, { newSalary: 3301, effectiveDate: HOJE, reason: 'mérito' }, HOJE)).toMatch(/limita o aumento a 10%/);
  });
  it('escada de cargos: só cargos da lista', () => {
    const p = policy({ positions: ['Analista Pleno', 'Analista Sênior'] });
    expect(checkPromotion(p, ana, { newPosition: 'analista senior', effectiveDate: HOJE, reason: 'mérito' }, HOJE)).toBeNull();
    expect(checkPromotion(p, ana, { newPosition: 'Diretor', effectiveDate: HOJE, reason: 'mérito' }, HOJE)).toMatch(/escada de cargos/);
  });
  it('tempo mínimo no cargo conta da admissão', () => {
    const p = policy({ minMonthsInRole: 12 });
    expect(checkPromotion(p, { ...ana, admissionDate: '2026-03-01' }, { newPosition: 'Sênior', effectiveDate: HOJE, reason: 'mérito' }, HOJE)).toMatch(/12 mês/);
    expect(checkPromotion(p, ana, { newPosition: 'Sênior', effectiveDate: HOJE, reason: 'mérito' }, HOJE)).toBeNull();
  });
  it('tempo mínimo conta da última promoção, não da admissão', () => {
    const p = policy({ minMonthsInRole: 12 });
    expect(checkPromotion(p, { ...ana, lastPromotionAt: '2026-06-01' }, { newPosition: 'Sênior', effectiveDate: HOJE, reason: 'mérito' }, HOJE)).toMatch(/12 mês/);
  });
  it('sem exigir motivo, aceita sem motivo', () => expect(checkPromotion(policy({ requireReason: false }), ana, { newPosition: 'Sênior', effectiveDate: HOJE }, HOJE)).toBeNull());
  it('promoção válida de cargo e salário', () => expect(checkPromotion(policy(), ana, { newPosition: 'Analista Sênior', newSalary: 3600, effectiveDate: '2026-11-01', reason: 'meta batida' }, HOJE)).toBeNull());
});

describe('meses entre datas', () => {
  it('15/01/2024 a 12/10/2026 = 32 meses', () => expect(monthsBetween(new Date('2024-01-15T00:00:00Z'), new Date('2026-10-12T00:00:00Z'))).toBe(32));
  it('não conta o mês incompleto', () => expect(monthsBetween(new Date('2026-01-20T00:00:00Z'), new Date('2026-03-19T00:00:00Z'))).toBe(1));
});

describe('política e mensagem', () => {
  it('valida política', () => {
    expect(validatePolicy({ minMonthsInRole: -1 })).toMatch(/0 a 240/);
    expect(validatePolicy({ maxRaisePercent: 0 })).toMatch(/Aumento máximo/);
    expect(validatePolicy({ minMonthsInRole: 6, maxRaisePercent: 20, positions: ['A'] })).toBeNull();
  });
  it('mensagem com cargo e salário', () => {
    const m = promotionMessage({ newPosition: 'Analista Sênior', newSalary: 3600, effectiveDate: '2026-11-01', reason: 'meta batida' });
    expect(m).toContain('01/11/2026');
    expect(m).toContain('Analista Sênior');
    expect(m).toMatch(/R\$\s?3\.600,00/);
    expect(m).toContain('Motivo: meta batida');
  });
  it('mensagem só com salário', () => expect(promotionMessage({ newSalary: 3600, effectiveDate: '2026-11-01' })).toMatch(/salário passa a ser/));
});
