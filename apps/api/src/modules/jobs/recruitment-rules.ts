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

export interface ScoreRule {
  points?: Record<string, number>;
  ranges?: { min?: number; max?: number; points: number }[];
}

export interface AnswerEvaluation {
  value: string;
  points: number;
  knockedOut: boolean;
  action?: 'FLAG' | 'REJECT';
  reason?: string;
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
  const result: AnswerEvaluation = { value, points: 0, knockedOut: false };
  if (!value) return result;

  const score = asRecord(question.scoreRule) as ScoreRule | null;
  if (score) {
    if (score.points && ['SELECT', 'YESNO', 'MULTI'].includes(question.type)) {
      const chosen = question.type === 'MULTI' ? splitMulti(value) : [value];
      const table = Object.fromEntries(Object.entries(score.points).map(([key, points]) => [norm(key), Number(points) || 0]));
      result.points = chosen.reduce((sum, item) => sum + (table[norm(item)] ?? 0), 0);
    }
    if (score.ranges && question.type === 'NUMBER') {
      const number = Number(value.replace(',', '.'));
      if (Number.isFinite(number)) {
        const range = score.ranges.find(
          (item) => (item.min === undefined || number >= item.min) && (item.max === undefined || number <= item.max),
        );
        result.points = range ? Number(range.points) || 0 : 0;
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
