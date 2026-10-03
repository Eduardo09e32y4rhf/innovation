import { describe, expect, it } from 'vitest';
import { evaluateAnswer, validateAnswerShape, weightedEvaluationScore, type RuleQuestion } from './recruitment-rules';

const base: RuleQuestion = { id: 'q1', label: 'Tem CNH B?', type: 'YESNO', required: true, options: [], knockout: null, scoreRule: null };

describe('recruitment rules', () => {
  it('marca candidato como eliminado quando a resposta não é aceita', () => {
    const question = { ...base, knockout: { acceptValues: ['Sim'], action: 'REJECT' } };
    expect(evaluateAnswer(question, 'Não')).toMatchObject({ knockedOut: true, action: 'REJECT' });
    expect(evaluateAnswer(question, 'Sim').knockedOut).toBe(false);
  });

  it('só sinaliza (FLAG) por padrão', () => {
    const question = { ...base, knockout: { acceptValues: ['Sim'] } };
    expect(evaluateAnswer(question, 'Não').action).toBe('FLAG');
  });

  it('soma pontos por opção, inclusive em múltipla escolha', () => {
    const multi: RuleQuestion = {
      ...base, type: 'MULTI', options: ['Excel', 'SQL', 'Power BI'],
      scoreRule: { points: { Excel: 5, SQL: 10 } },
    };
    expect(evaluateAnswer(multi, 'Excel|SQL|Power BI').points).toBe(15);
  });

  it('pontua e elimina por faixa numérica', () => {
    const number: RuleQuestion = {
      ...base, type: 'NUMBER', label: 'Anos de experiência',
      knockout: { min: 2 }, scoreRule: { ranges: [{ min: 0, max: 2, points: 0 }, { min: 3, points: 20 }] },
    };
    expect(evaluateAnswer(number, '1')).toMatchObject({ knockedOut: true, points: 0 });
    expect(evaluateAnswer(number, '5')).toMatchObject({ knockedOut: false, points: 20 });
  });

  it('valida obrigatoriedade e opções', () => {
    expect(validateAnswerShape(base, '')).toMatch(/Responda/);
    expect(validateAnswerShape(base, 'Talvez')).toMatch(/inválida/);
    expect(validateAnswerShape({ ...base, required: false }, '')).toBeNull();
  });

  it('calcula média ponderada por critério', () => {
    const criteria = [{ id: 'a', weight: 3 }, { id: 'b', weight: 1 }];
    const evaluations = [{ criterionId: 'a', score: 5 }, { criterionId: 'a', score: 3 }, { criterionId: 'b', score: 1 }];
    expect(weightedEvaluationScore(evaluations, criteria)).toBe(3.3);
    expect(weightedEvaluationScore([], criteria)).toBeNull();
  });
});
