export type QuestionType = 'TEXT' | 'LONG' | 'SELECT' | 'MULTI' | 'YESNO' | 'NUMBER';

export interface RuleQuestion {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  knockout: unknown;
  scoreRule: unknown;
}

export interface KnockoutRule {
  acceptValues?: string[];
  min?: number;
  max?: number;
  action?: 'FLAG' | 'REJECT';
}

/**
 * Pontuacao da triagem.
 * v2 (atual): cada pergunta tem importancia (peso 1 a 3) e cada resposta vale de 0 a 100% da pergunta.
 * A nota do candidato e a media ponderada, sempre de 0 a 100% (nunca passa de 100%).
 * Legado: pontos livres por opcao/faixa; viram % dividindo pelo maximo possivel da pergunta.
 */
export interface ScoreRule {
  v?: 2;
  weight?: number;
  levels?: Record<string, number>;
  points?: Record<string, number>;
  ranges?: { min?: number; max?: number; points?: number; pct?: number }[];
}

export interface AnswerEvaluation {
  value: string;
  /** % da pergunta (0 a 100) que a resposta alcancou; 0 sem regra de pontuacao. */
  points: number;
  /** Peso da pergunta na nota (0 = nao pontua). */
  weight: number;
  knockedOut: boolean;
  action?: 'FLAG' | 'REJECT';
  reason?: string;
}

const clampPct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

/** Peso da pergunta na nota: v2 usa a importancia (1 a 3); legado conta como 1 se tiver regra. */
export function questionWeight(question: Pick<RuleQuestion, 'scoreRule'>): number {
  const score = asRecord(question.scoreRule) as ScoreRule | null;
  if (!score) return 0;
  if (score.v === 2) {
    const hasRule = Boolean((score.levels && Object.keys(score.levels).length) || score.ranges?.length);
    return hasRule ? Math.max(1, Math.min(3, Math.round(Number(score.weight) || 1))) : 0;
  }
  return (score.points && Object.keys(score.points).length) || score.ranges?.length ? 1 : 0;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const norm = (value: string) => value.trim().toLowerCase();

export function splitMulti(value: string): string[] {
  return value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeAnswerValue(question: Pick<RuleQuestion, 'type'>, raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  if (Array.isArray(raw)) return raw.map((item) => String(item).trim()).filter(Boolean).join('|');
  if (typeof raw === 'boolean') return raw ? 'Sim' : 'Não';
  return String(raw).trim();
}

export function evaluateAnswer(question: RuleQuestion, value: string): AnswerEvaluation {
  const weight = questionWeight(question);
  const result: AnswerEvaluation = { value, points: 0, weight, knockedOut: false };
  if (!value) return result;

  const score = asRecord(question.scoreRule) as ScoreRule | null;
  if (score && weight) {
    const chosen = question.type === 'MULTI' ? splitMulti(value) : [value];
    if (score.v === 2) {
      if (score.levels && ['SELECT', 'YESNO', 'MULTI'].includes(question.type)) {
        const table = Object.fromEntries(Object.entries(score.levels).map(([key, pct]) => [norm(key), clampPct(Number(pct) || 0)]));
        // Multipla escolha vale a melhor opcao marcada (marcar tudo nao da mais que 100%).
        result.points = Math.max(0, ...chosen.map((item) => table[norm(item)] ?? 0));
      }
      if (score.ranges && question.type === 'NUMBER') {
        const number = Number(value.replace(',', '.'));
        const range = Number.isFinite(number) ? score.ranges.find((item) => (item.min === undefined || item.min === null || number >= item.min) && (item.max === undefined || item.max === null || number <= item.max)) : undefined;
        result.points = range ? clampPct(Number(range.pct) || 0) : 0;
      }
    } else {
      if (score.points && ['SELECT', 'YESNO', 'MULTI'].includes(question.type)) {
        const table = Object.fromEntries(Object.entries(score.points).map(([key, points]) => [norm(key), Number(points) || 0]));
        const earned = chosen.reduce((sum, item) => sum + (table[norm(item)] ?? 0), 0);
        const values = Object.values(table).filter((points) => points > 0);
        const max = question.type === 'MULTI' ? values.reduce((a, b) => a + b, 0) : Math.max(0, ...values);
        result.points = max > 0 ? clampPct((earned / max) * 100) : 0;
      }
      if (score.ranges && question.type === 'NUMBER') {
        const number = Number(value.replace(',', '.'));
        const max = Math.max(0, ...score.ranges.map((item) => Number(item.points) || 0));
        const range = Number.isFinite(number) ? score.ranges.find((item) => (item.min === undefined || number >= item.min) && (item.max === undefined || number <= item.max)) : undefined;
        result.points = range && max > 0 ? clampPct(((Number(range.points) || 0) / max) * 100) : 0;
      }
    }
  }

  const knockout = asRecord(question.knockout) as KnockoutRule | null;
  if (knockout) {
    let failed = false;
    if (Array.isArray(knockout.acceptValues) && knockout.acceptValues.length) {
      const accepted = new Set(knockout.acceptValues.map(norm));
      const chosen = question.type === 'MULTI' ? splitMulti(value) : [value];
      failed = !chosen.some((item) => accepted.has(norm(item)));
    }
    if (question.type === 'NUMBER' && (knockout.min !== undefined || knockout.max !== undefined)) {
      const number = Number(value.replace(',', '.'));
      if (!Number.isFinite(number)) failed = true;
      else if (knockout.min !== undefined && number < knockout.min) failed = true;
      else if (knockout.max !== undefined && number > knockout.max) failed = true;
    }
    if (failed) {
      result.knockedOut = true;
      result.action = knockout.action === 'REJECT' ? 'REJECT' : 'FLAG';
      result.reason = `Resposta fora do critério em "${question.label}"`;
    }
  }
  return result;
}

export function validateAnswerShape(question: RuleQuestion, value: string): string | null {
  if (!value) return question.required ? `Responda: ${question.label}` : null;
  if (question.type === 'NUMBER' && !Number.isFinite(Number(value.replace(',', '.')))) {
    return `Informe um número válido em: ${question.label}`;
  }
  if (['SELECT', 'YESNO'].includes(question.type)) {
    const allowed = question.type === 'YESNO' ? ['Sim', 'Não'] : question.options;
    if (!allowed.some((option) => norm(option) === norm(value))) return `Opção inválida em: ${question.label}`;
  }
  if (question.type === 'MULTI') {
    const allowed = question.options.map(norm);
    if (!splitMulti(value).every((item) => allowed.includes(norm(item)))) return `Opção inválida em: ${question.label}`;
  }
  if (value.length > (question.type === 'LONG' ? 3000 : 500)) return `Resposta muito longa em: ${question.label}`;
  return null;
}

export function weightedEvaluationScore(
  evaluations: { criterionId: string; score: number }[],
  criteria: { id: string; weight: number }[],
): number | null {
  if (!evaluations.length || !criteria.length) return null;
  const byCriterion = new Map<string, number[]>();
  for (const item of evaluations) byCriterion.set(item.criterionId, [...(byCriterion.get(item.criterionId) ?? []), item.score]);
  let total = 0;
  let weights = 0;
  for (const criterion of criteria) {
    const scores = byCriterion.get(criterion.id);
    if (!scores?.length) continue;
    total += (scores.reduce((a, b) => a + b, 0) / scores.length) * criterion.weight;
    weights += criterion.weight;
  }
  return weights ? Math.round((total / weights) * 10) / 10 : null;
}

/**
 * Nota da triagem de 0 a 100%: media das respostas ponderada pela importancia de cada pergunta.
 * Pergunta pontuada sem resposta conta 0%. Sem nenhuma pergunta pontuada, nao ha nota (null).
 */
export function screeningScore(evaluations: Pick<AnswerEvaluation, 'points' | 'weight'>[]): number | null {
  const scored = evaluations.filter((item) => item.weight > 0);
  const total = scored.reduce((sum, item) => sum + item.weight, 0);
  if (!total) return null;
  return Math.round(scored.reduce((sum, item) => sum + item.points * item.weight, 0) / total);
}

/** Quanto cada pergunta vale na nota (soma sempre 100%). */
export function weightShares(questions: Pick<RuleQuestion, 'scoreRule'>[]): number[] {
  const weights = questions.map(questionWeight);
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((weight) => (total ? Math.round((weight / total) * 100) : 0));
}
