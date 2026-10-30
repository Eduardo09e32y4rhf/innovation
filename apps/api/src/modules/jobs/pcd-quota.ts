/**
 * Cota de pessoas com deficiencia (PCD) e beneficiarios reabilitados - Lei 8.213/1991, art. 93:
 * 100 a 200 empregados: 2%; 201 a 500: 3%; 501 a 1.000: 4%; acima de 1.000: 5%.
 * Fonte: texto do art. 93 conferido por BUSCA em fontes secundarias (VIA BUSCA). O arredondamento da fracao para CIMA
 * segue a pratica do Ministerio do Trabalho e NAO foi verificado no texto oficial: validacao pendente do usuario/advogado.
 */
export interface PcdQuota { applies: boolean; employees: number; percent: number; required: number; filled: number; missing: number; met: boolean }

export function pcdPercent(employees: number): number {
  if (employees < 100) return 0;
  if (employees <= 200) return 2;
  if (employees <= 500) return 3;
  if (employees <= 1000) return 4;
  return 5;
}

export function pcdQuota(employees: number, filled: number): PcdQuota {
  const percent = pcdPercent(employees);
  const required = percent ? Math.ceil((employees * percent) / 100 - 1e-9) : 0;
  const missing = Math.max(0, required - filled);
  return { applies: percent > 0, employees, percent, required, filled, missing, met: percent > 0 && missing === 0 };
}
