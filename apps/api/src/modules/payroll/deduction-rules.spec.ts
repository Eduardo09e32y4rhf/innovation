import { describe, expect, it } from 'vitest';
import { computeDeductions, ruleApplies, validateRule, type DeductionRuleLike } from './deduction-rules';

const rule = (over: Partial<DeductionRuleLike> = {}): DeductionRuleLike => ({ id: 'r1', name: 'Vale-transporte', category: 'BENEFIT', kind: 'PERCENT', value: 6, base: 'SALARY', maxAmount: null, scope: 'ALL', targets: [], startDate: null, endDate: null, isActive: true, ...over });
const ana = { id: 'e1', position: 'Analista', department: 'Operações' };
const mes = { periodStart: new Date('2026-08-01T00:00:00Z'), periodEnd: new Date('2026-08-31T00:00:00Z') };

describe('quem recebe o desconto', () => {
  it('regra para todos vale para qualquer um', () => expect(ruleApplies(rule(), ana, mes.periodStart, mes.periodEnd)).toBe(true));
  it('regra inativa não vale', () => expect(ruleApplies(rule({ isActive: false }), ana, mes.periodStart, mes.periodEnd)).toBe(false));
  it('por cargo ignora maiúsculas e acentos', () => {
    const r = rule({ scope: 'POSITION', targets: ['ANALISTA'] });
    expect(ruleApplies(r, ana, mes.periodStart, mes.periodEnd)).toBe(true);
    expect(ruleApplies(r, { ...ana, position: 'Gerente' }, mes.periodStart, mes.periodEnd)).toBe(false);
  });
  it('por setor', () => {
    const r = rule({ scope: 'DEPARTMENT', targets: ['operacoes'] });
    expect(ruleApplies(r, ana, mes.periodStart, mes.periodEnd)).toBe(true);
    expect(ruleApplies(r, { ...ana, department: 'RH' }, mes.periodStart, mes.periodEnd)).toBe(false);
  });
  it('por pessoa usa o id', () => {
    const r = rule({ scope: 'EMPLOYEE', targets: ['e1'] });
    expect(ruleApplies(r, ana, mes.periodStart, mes.periodEnd)).toBe(true);
    expect(ruleApplies(r, { ...ana, id: 'e2' }, mes.periodStart, mes.periodEnd)).toBe(false);
  });
  it('vigência: só entra se o período encosta na vigência', () => {
    expect(ruleApplies(rule({ startDate: new Date('2026-09-01T00:00:00Z') }), ana, mes.periodStart, mes.periodEnd)).toBe(false);
    expect(ruleApplies(rule({ endDate: new Date('2026-07-31T00:00:00Z') }), ana, mes.periodStart, mes.periodEnd)).toBe(false);
    expect(ruleApplies(rule({ startDate: new Date('2026-08-15T00:00:00Z'), endDate: new Date('2026-12-31T00:00:00Z') }), ana, mes.periodStart, mes.periodEnd)).toBe(true);
  });
});

describe('valor do desconto (conferido à mão)', () => {
  const base = { gross: 3150, salaryBase: 3000, netBefore: 2800, ...mes };
  it('6% do salário base de R$ 3.000 = R$ 180,00', () => expect(computeDeductions([rule()], ana, base).total).toBe(180));
  it('6% do bruto de R$ 3.150 = R$ 189,00', () => expect(computeDeductions([rule({ base: 'GROSS' })], ana, base).total).toBe(189));
  it('valor fixo de R$ 120,50', () => expect(computeDeductions([rule({ kind: 'FIXED', value: 120.5 })], ana, base).total).toBe(120.5));
  it('teto limita o percentual (6% = 180, teto 150)', () => expect(computeDeductions([rule({ maxAmount: 150 })], ana, base).total).toBe(150));
  it('soma vários descontos', () => {
    const r = computeDeductions([rule(), rule({ id: 'r2', name: 'Plano de saúde', kind: 'FIXED', value: 220 })], ana, base);
    expect(r.items).toHaveLength(2);
    expect(r.total).toBe(400);
  });
  it('o total nunca passa do líquido disponível (líquido não fica negativo)', () => {
    const r = computeDeductions([rule({ kind: 'FIXED', value: 2000 }), rule({ id: 'r2', kind: 'FIXED', value: 2000 })], ana, base);
    expect(r.total).toBe(2800);
    expect(r.items[1].amount).toBe(800);
  });
  it('sem regra aplicável, zero', () => expect(computeDeductions([rule({ scope: 'POSITION', targets: ['Gerente'] })], ana, base)).toEqual({ items: [], total: 0 }));
  it('arredonda em centavos (7,5% de 3.333,33)', () => expect(computeDeductions([rule({ value: 7.5, base: 'GROSS' })], ana, { ...base, gross: 3333.33 }).total).toBe(250));
});

describe('validação da regra', () => {
  const ok = { name: 'Vale-transporte', kind: 'PERCENT', value: 6, scope: 'ALL' };
  it('regra completa passa', () => expect(validateRule(ok)).toBeNull());
  it('sem nome', () => expect(validateRule({ ...ok, name: ' ' })).toMatch(/nome/));
  it('valor zero ou negativo', () => { expect(validateRule({ ...ok, value: 0 })).toMatch(/maior que zero/); expect(validateRule({ ...ok, value: -5 })).toMatch(/maior que zero/); });
  it('percentual acima de 100', () => expect(validateRule({ ...ok, value: 101 })).toMatch(/100%/));
  it('por cargo sem escolher cargo', () => expect(validateRule({ ...ok, scope: 'POSITION', targets: [] })).toMatch(/ao menos um/));
  it('vigência invertida', () => expect(validateRule({ ...ok, startDate: '2026-09-01', endDate: '2026-08-01' })).toMatch(/vigência/));
  it('teto inválido', () => expect(validateRule({ ...ok, maxAmount: -1 })).toMatch(/teto/));
});
