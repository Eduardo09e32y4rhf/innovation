/**
 * Arredondamento monetário "meio para cima" sem o erro do ponto flutuante.
 * `Math.round((v + EPSILON) * 100) / 100` erra casos de meio centavo: 1621 × 7,5% dá 121,57499999999999 em vez de
 * 121,575, e o INSS do salário mínimo saía R$ 0,01 menor. Normalizar o produto escalado (14 dígitos significativos)
 * remove o ruído de 1e-13 antes de arredondar.
 */
export function roundMoney(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  const scaled = Number((Math.abs(value) * factor).toPrecision(14));
  return (Math.sign(value) * Math.round(scaled)) / factor || 0;
}
