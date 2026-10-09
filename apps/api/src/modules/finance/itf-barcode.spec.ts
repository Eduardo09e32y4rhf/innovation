import { describe, expect, it } from 'vitest';
import { barCodeFromDigitableLine, itfBars } from './itf-barcode';

describe('código de barras ITF do boleto', () => {
  it('44 dígitos ocupam 405 módulos (4 de início + 22 pares x 18 + 5 de fim): 405 x 0,254 mm = 103 mm, a largura da norma', () => {
    const { bars, total } = itfBars('0'.repeat(44));
    expect(total).toBe(4 + 22 * 18 + 5);
    expect(total * 0.254).toBeCloseTo(103, 0);
    expect(bars[0]).toEqual({ x: 0, width: 1 });
    expect(bars[1]).toEqual({ x: 2, width: 1 }); // 2ª barra do início (depois de um espaço estreito)
    expect(bars.at(-1)).toEqual({ x: total - 1, width: 1 });
    expect(bars.at(-2)).toEqual({ x: total - 5, width: 3 }); // barra larga do fim
  });

  it('cada par de dígitos usa 5 barras e 5 espaços, 2 largos de cada', () => {
    const one = itfBars('00'); // 0 = nnwwn: 2 elementos largos
    const wideBars = one.bars.slice(2, 7).filter((b) => b.width === 3).length;
    expect(wideBars).toBe(2);
  });

  it('recusa quantidade ímpar ou texto não numérico', () => {
    expect(() => itfBars('123')).toThrow();
    expect(() => itfBars('12ab')).toThrow();
  });

  it('converte linha digitável (47) em código de barras (44)', () => {
    // Exemplo de boleto de teste: banco 001, valor 0000010000.
    const barCode = '00193373700000001000500940144816060680935031';
    const line = `${barCode.slice(0, 4)}${barCode.slice(19, 24)}` + '0'; // monta uma linha só para checar o tamanho
    expect(barCodeFromDigitableLine(line)).toBeNull(); // 10 dígitos: inválida
    const digitable = '00190500954014481606906809350314337370000000100';
    expect(digitable).toHaveLength(47);
    expect(barCodeFromDigitableLine(digitable)).toBe('00193373700000001000500940144816060680935031');
  });
});
