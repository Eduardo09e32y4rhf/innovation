import { BadRequestException } from '@nestjs/common';

/** Comparacao lado a lado de candidatos (regras puras): de 2 a 4 candidaturas da mesma vaga. */
export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** `?ids=a,b,c` -> lista sem repeticao; erro 400 se algum id nao for UUID ou se fugir de 2 a 4. */
export function parseCompareIds(raw: unknown): string[] {
  const ids = [...new Set(String(raw ?? '').split(',').map((item) => item.trim()).filter(Boolean))];
  if (ids.some((id) => !UUID.test(id))) throw new BadRequestException('Candidaturas inválidas.');
  if (ids.length < COMPARE_MIN) throw new BadRequestException(`Escolha de ${COMPARE_MIN} a ${COMPARE_MAX} candidatos para comparar.`);
  if (ids.length > COMPARE_MAX) throw new BadRequestException(`Compare no máximo ${COMPARE_MAX} candidatos por vez.`);
  return ids;
}

export interface CriterionLike { id: string; name: string; weight: number }
export type CriterionSummary = Record<string, { average: number | null; count: number }>;

/** Media (1 casa) das notas de cada criterio entre os avaliadores visiveis. */
export function summarizeCriteria(criteria: CriterionLike[], evaluations: Array<{ criterionId: string; score: number }>): CriterionSummary {
  const out: CriterionSummary = {};
  for (const criterion of criteria) {
    const scores = evaluations.filter((item) => item.criterionId === criterion.id).map((item) => item.score);
    out[criterion.id] = { average: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null, count: scores.length };
  }
  return out;
}

/** Por criterio, quem tem a maior media (empate destaca todos; sem nota alguma = ninguem). */
export function bestPerCriterion(criteria: CriterionLike[], byCandidate: Record<string, CriterionSummary>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const criterion of criteria) {
    const rows = Object.entries(byCandidate).map(([id, summary]) => [id, summary[criterion.id]?.average ?? null] as const).filter(([, average]) => average !== null);
    const top = rows.length ? Math.max(...rows.map(([, average]) => average as number)) : null;
    out[criterion.id] = top === null ? [] : rows.filter(([, average]) => average === top).map(([id]) => id);
  }
  return out;
}
