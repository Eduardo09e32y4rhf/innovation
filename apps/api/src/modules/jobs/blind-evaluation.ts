/**
 * Avaliação cega: cada avaliador dá suas notas sem ver as dos outros (evita viés de ancoragem).
 * As notas dos colegas só aparecem depois que o próprio avaliador preencheu todos os critérios da vaga.
 */
export interface EvaluationLike { userId: string; criterionId: string }

export function visibleEvaluations<T extends EvaluationLike>(evaluations: T[], viewerId: string, criteriaIds: string[]): { items: T[]; blind: boolean } {
  const mine = evaluations.filter((evaluation) => evaluation.userId === viewerId);
  const done = new Set(mine.map((evaluation) => evaluation.criterionId));
  const completed = criteriaIds.length === 0 || criteriaIds.every((id) => done.has(id));
  if (completed) return { items: evaluations, blind: false };
  return { items: mine, blind: evaluations.length > mine.length };
}