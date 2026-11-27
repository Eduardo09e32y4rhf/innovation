/** Único dicionário de tags. Chaves desconhecidas nunca viram texto visível. */
export const jobTagLabels: Record<string, string> = {
  pede_comunicacao: 'Comunicação', comunicacao: 'Comunicação',
  pede_ingles: 'Inglês exigido', ingles: 'Inglês exigido',
  pede_equipe: 'Trabalho em equipe', trabalho_em_equipe: 'Trabalho em equipe',
  pede_vendas: 'Experiência em vendas', experiencia_em_vendas: 'Experiência em vendas',
  cargo_vendas: 'Área: Vendas', vendas: 'Área: Vendas',
  remoto: 'Remoto', remote: 'Remoto', pcd: 'Vaga PCD',
  junior: 'Júnior', pleno: 'Pleno', senior: 'Sênior',
};
export const tagKey = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[:\s-]+/g, '_');
export function readableJobTags(values: (string | false | null | undefined)[]) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string').map(value => jobTagLabels[tagKey(value)]).filter(Boolean))].slice(0, 3);
}
