import { describe, expect, it } from 'vitest';
import { countDependents } from './dependents';
import { PayrollCalculationService } from '../../modules/time-track/payroll-calculation.service';

describe('countDependents', () => {
  it.each([
    [null, 0], [undefined, 0], ['', 0], ['  ', 0], [0, 0], [-3, 0], [NaN, 0],
    [2, 2], ['2', 2], [' 3 ', 3], ['07', 7], [1.9, 1],
    [[{ nome: 'A' }, { nome: 'B' }], 2], ['[{"nome":"A"},{"nome":"B"},{"nome":"C"}]', 3], ['[]', 0],
    ['{"dependents":[1,2]}', 2], ['{"count":4}', 4], ['{"nome":"Solo"}', 1], ['{}', 0],
    ['"2"', 2], ['Ana, Bruno', 2], ['Ana; Bruno;\nCarla', 3], ['Ana,,  ,', 1],
    ['[quebrado', 1], ['{nao json', 1], [true, 0], [{}, 0], [999, 20],
  ])('%j -> %i', (input, expected) => {
    expect(countDependents(input)).toBe(expected);
  });

  it('nunca lança, mesmo com valores exóticos', () => {
    for (const v of [Symbol('x'), () => 1, new Date(), 10n, [[]], { a: { b: 1 } }]) {
      expect(() => countDependents(v as never)).not.toThrow();
    }
  });
});

describe('mesmo funcionário, mesmo IRRF (aba contábil x folha)', () => {
  const engine = new PayrollCalculationService();
  const gross = 7000;
  const formats: Array<[string, unknown, number]> = [
    ['array JSON', [{ nome: 'A' }, { nome: 'B' }], 2],
    ['string JSON', '[{"nome":"A"},{"nome":"B"}]', 2],
    ['número em texto', '2', 2],
    ['lista por vírgula', 'Ana, Bruno', 2],
  ];
  it.each(formats)('%s', (_label, raw, n) => {
    const hub = engine.applyTaxes(gross, countDependents(raw));
    const folha = engine.applyTaxes(gross, n);
    expect(hub.irrfDiscount).toBe(folha.irrfDiscount);
    expect(hub.netPay).toBe(folha.netPay);
  });
});
