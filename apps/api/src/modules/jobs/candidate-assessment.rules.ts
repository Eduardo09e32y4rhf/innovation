import { BadRequestException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { QUESTION_BANK } from './candidate-question-bank';

export const ASSESSMENT_KINDS = ['PORTUGUESE', 'MATH', 'ESSAY', 'CULTURE', 'WORK_STYLE'] as const;
export type AssessmentKind = typeof ASSESSMENT_KINDS[number];
export const ASSESSMENT_LABELS: Record<AssessmentKind, string> = { PORTUGUESE: 'Português', MATH: 'Matemática', ESSAY: 'Redação', CULTURE: 'Fit cultural: preferências de trabalho', WORK_STYLE: 'Questionário de rotina profissional' };
export const REQUIRED_ASSESSMENTS: AssessmentKind[] = ['PORTUGUESE', 'MATH', 'ESSAY'];
export const ESSAY_PROMPT = 'Como a comunicação clara e a colaboração podem ajudar uma equipe a resolver um problema no trabalho? Apresente uma situação hipotética, proponha ações e explique os resultados esperados. Escreva de 150 a 600 palavras, sem incluir nomes reais, documentos ou informações confidenciais.';
export const ESSAY_RUBRIC = ['Adequação ao tema', 'Clareza e organização das ideias', 'Argumentação e exemplos', 'Coesão e coerência', 'Ortografia e concordância'];
export type AssessmentQuestion = { id: string; text: string; options: string[]; correct?: number; topic?: string };
export function assessmentKind(raw: string): AssessmentKind {
  if (!ASSESSMENT_KINDS.includes(raw as AssessmentKind)) throw new BadRequestException('Avaliação inválida.');
  return raw as AssessmentKind;
}
function shuffle<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
const preferences = {
  CULTURE: ['Prefiro receber orientações claras sobre prioridades.', 'Gosto de discutir decisões em equipe.', 'Prefiro autonomia para organizar minhas tarefas.', 'Valorizo feedback frequente sobre meu trabalho.', 'Prefiro uma rotina previsível.', 'Gosto de experimentar novas formas de realizar tarefas.', 'Valorizo regras transparentes para todos.', 'Prefiro definir metas junto com a equipe.', 'Gosto de compartilhar o que aprendo.', 'Valorizo tempo reservado para concentração.', 'Prefiro resolver divergências por meio de conversa direta e respeitosa.', 'Valorizo flexibilidade na organização do trabalho.'],
  WORK_STYLE: ['Costumo planejar as tarefas antes de começar.', 'Costumo pedir esclarecimentos quando uma instrução é ambígua.', 'Costumo conferir meu trabalho antes de entregá-lo.', 'Costumo registrar prazos e compromissos.', 'Costumo avisar a equipe quando encontro um impedimento.', 'Costumo reservar tempo para aprender uma tarefa nova.', 'Costumo dividir tarefas grandes em etapas menores.', 'Costumo ouvir sugestões antes de escolher uma solução.', 'Costumo reorganizar prioridades quando surge uma urgência.', 'Costumo documentar decisões importantes.', 'Costumo pedir ajuda quando não consigo avançar.', 'Costumo revisar o que poderia melhorar ao terminar uma atividade.'],
};
export function selectAssessmentQuestions(kind: AssessmentKind): AssessmentQuestion[] {
  if (kind === 'ESSAY') return [];
  if (kind === 'CULTURE' || kind === 'WORK_STYLE') return preferences[kind].map((text, index) => ({ id: `${kind}-${index + 1}`, text, options: kind === 'CULTURE' ? ['Discordo totalmente', 'Discordo parcialmente', 'Nem concordo nem discordo', 'Concordo parcialmente', 'Concordo totalmente'] : ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'] }));
  const available = QUESTION_BANK.filter(item => item.subject === kind);
  // Cover multiple topics instead of allowing one repeated topic to dominate.
  const topics = shuffle([...new Set(available.map(item => item.topic))]);
  const selected = topics.slice(0, 20).map(topic => shuffle(available.filter(item => item.topic === topic))[0]);
  if (selected.length < 20) selected.push(...shuffle(available.filter(item => !selected.includes(item))).slice(0, 20 - selected.length));
  return shuffle(selected).map(item => {
    const order = shuffle([0, 1, 2, 3, 4]);
    return { id: item.id, text: item.text, topic: item.topic, options: order.map(index => item.options[index]), correct: order.indexOf(item.correct) };
  });
}
export function publicQuestions(questions: AssessmentQuestion[]) {
  return questions.map(({ id, text, options }) => ({ id, text, options }));
}
export function validateAssessmentAnswers(questions: AssessmentQuestion[], raw: unknown, complete: boolean): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Respostas inválidas.');
  const answers: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    const question = questions.find(item => item.id === key);
    if (!question || typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= question.options.length) throw new BadRequestException('Há uma resposta inválida. Recarregue a avaliação.');
    answers[key] = value;
  }
  if (complete && questions.some(question => answers[question.id] === undefined)) throw new BadRequestException('Responda todas as perguntas antes de concluir.');
  return answers;
}
export function essayWordCount(text: string) { return text.trim().split(/\s+/u).filter(Boolean).length; }
export function gradeAssessment(questions: AssessmentQuestion[], answers: Record<string, number>) {
  return questions.length ? Math.round(100 * questions.filter(question => answers[question.id] === question.correct).length / questions.length) : 0;
}
