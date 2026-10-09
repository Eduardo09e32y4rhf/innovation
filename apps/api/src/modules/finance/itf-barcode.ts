/** Código de barras do boleto bancário: padrão ITF (intercalado 2 de 5), 44 dígitos. */

// n = barra/espaço estreito, w = largo (razão 3:1).
const PATTERNS = ['nnwwn', 'wnnnw', 'nwnnw', 'wwnnn', 'nnwnw', 'wnwnn', 'nwwnn', 'nnnww', 'wnnwn', 'nwnwn'];

/** Linha digitável (47 dígitos) → código de barras (44 dígitos), na ordem definida pela Febraban. */
export function barCodeFromDigitableLine(line: string): string | null {
  const d = line.replace(/\D/g, '');
  if (d.length !== 47) return null;
  return d.slice(0, 4) + d.slice(32, 33) + d.slice(33, 47) + d.slice(4, 9) + d.slice(10, 20) + d.slice(21, 31);
}

export interface BarSegment { x: number; width: number }

/**
 * Barras pretas do código (espaços ficam em branco), em unidades de "módulo estreito".
 * `total` é a largura total em módulos: quem desenha escala para a largura desejada.
 */
export function itfBars(digits: string): { bars: BarSegment[]; total: number } {
  if (!/^\d+$/.test(digits) || digits.length % 2 !== 0) throw new Error('ITF exige uma quantidade par de dígitos numéricos.');
  const widths: number[] = [1, 1, 1, 1]; // início: barra, espaço, barra, espaço (todos estreitos)
  for (let i = 0; i < digits.length; i += 2) {
    const bar = PATTERNS[Number(digits[i])];
    const space = PATTERNS[Number(digits[i + 1])];
    for (let j = 0; j < 5; j += 1) {
      widths.push(bar[j] === 'w' ? 3 : 1);
      widths.push(space[j] === 'w' ? 3 : 1);
    }
  }
  widths.push(3, 1, 1); // fim: barra larga, espaço estreito, barra estreita

  const bars: BarSegment[] = [];
  let x = 0;
  widths.forEach((width, index) => {
    if (index % 2 === 0) bars.push({ x, width }); // posições pares são barras; ímpares, espaços
    x += width;
  });
  return { bars, total: x };
}
