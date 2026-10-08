import { describe, expect, it } from 'vitest';
import { roundMoney } from './money';

describe('roundMoney', () => {
  it('meio centavo sobe, mesmo quando o ponto flutuante fica um pouco abaixo (INSS do salário mínimo 2026)', () => {
    expect(1621 * 0.075).toBeLessThan(121.575); // o ruído que causava o erro
    expect(roundMoney(1621 * 0.075)).toBe(121.58);
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.675)).toBe(2.68);
    expect(roundMoney(0.285)).toBe(0.29);
  });
  it('valores comuns não mudam', () => {
    expect(roundMoney(10)).toBe(10);
    expect(roundMoney(1234.564)).toBe(1234.56);
    expect(roundMoney(1234.566)).toBe(1234.57);
    expect(roundMoney(0)).toBe(0);
  });
  it('negativos são simétricos e nunca devolvem -0', () => {
    expect(roundMoney(-1.005)).toBe(-1.01);
    expect(Object.is(roundMoney(-0.001), -0)).toBe(false);
  });
  it('NaN e infinito viram 0, e as casas são configuráveis', () => {
    expect(roundMoney(Number.NaN)).toBe(0);
    expect(roundMoney(Infinity)).toBe(0);
    expect(roundMoney(0.123456789, 4)).toBe(0.1235);
    expect(roundMoney(12.3456, 6)).toBe(12.3456);
  });
  it('é idempotente e fica a no máximo 1 centavo do valor original', () => {
    for (let v = 0; v < 20000; v += 7.3137) {
      const r = roundMoney(v);
      expect(roundMoney(r)).toBe(r);
      expect(Math.abs(r - v)).toBeLessThanOrEqual(0.0051);
    }
  });
});
