import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export interface TechnicalQuestion { id: string; text: string; options: string[]; correct: number; weight: number }

/** Valida e limpa o teste tecnico salvo pelo RH. */
export function normalizeTechnicalQuestions(raw: unknown): TechnicalQuestion[] {
  if (!Array.isArray(raw)) throw new BadRequestException('Adicione as perguntas do teste.');
  if (raw.length > 60) throw new BadRequestException('No máximo 60 perguntas.');
  return raw.map((item, index) => {
    const value = (item ?? {}) as Record<string, unknown>;
    const text = String(value.text ?? '').trim().slice(0, 1000);
    const options = (Array.isArray(value.options) ? value.options : []).map((option) => String(option ?? '').trim().slice(0, 300)).filter(Boolean);
    const correct = Number(value.correct);
    const weight = value.weight === undefined ? 1 : Number(value.weight);
    if (!text) throw new BadRequestException(`Pergunta ${index + 1}: escreva o enunciado.`);
    if (options.length < 2 || options.length > 6) throw new BadRequestException(`Pergunta ${index + 1}: de 2 a 6 alternativas.`);
    if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) throw new BadRequestException(`Pergunta ${index + 1}: marque a alternativa correta.`);
    if (!Number.isFinite(weight) || weight < 1 || weight > 10) throw new BadRequestException(`Pergunta ${index + 1}: peso de 1 a 10.`);
    const id = typeof value.id === 'string' && /^[A-Za-z0-9-]{6,40}$/.test(value.id) ? value.id : randomUUID();
    return { id, text, options, correct, weight: Math.round(weight) };
  });
}

/** Nota de 0 a 100 ponderada pelo peso; pergunta sem resposta conta como errada. */
export function scoreTechnical(questions: TechnicalQuestion[], answers: Record<string, unknown>) {
  const total = questions.reduce((sum, question) => sum + question.weight, 0);
  let earned = 0;
  let correct = 0;
  for (const question of questions) {
    if (Number(answers[question.id]) === question.correct && answers[question.id] !== null && answers[question.id] !== '') { earned += question.weight; correct += 1; }
  }
  return { score: total ? Math.round((earned / total) * 100) : 0, correct, total: questions.length };
}

/** Versao do teste que vai para o candidato: sem gabarito nem peso. */
export function publicTechnicalQuestions(questions: TechnicalQuestion[]) {
  return questions.map(({ id, text, options }) => ({ id, text, options }));
}

// ---------- comportamental (4 perfis) ----------
export type Profile = 'EXECUTOR' | 'COMUNICADOR' | 'PLANEJADOR' | 'ANALISTA';
export const PROFILES: Record<Profile, { label: string; summary: string; strengths: string; attention: string }> = {
  EXECUTOR: { label: 'Executor', summary: 'Foco em resultado, decide rápido e gosta de desafios.', strengths: 'Iniciativa, objetividade, senso de urgência.', attention: 'Pode atropelar etapas e ouvir pouco.' },
  COMUNICADOR: { label: 'Comunicador', summary: 'Foco em pessoas, energia, persuasão e trabalho em grupo.', strengths: 'Relacionamento, entusiasmo, influência.', attention: 'Pode perder detalhes e prazos.' },
  PLANEJADOR: { label: 'Planejador', summary: 'Foco em estabilidade, constância e cooperação.', strengths: 'Paciência, lealdade, rotina bem feita.', attention: 'Pode resistir a mudanças rápidas.' },
  ANALISTA: { label: 'Analista', summary: 'Foco em qualidade, regras, dados e precisão.', strengths: 'Organização, cuidado, pensamento crítico.', attention: 'Pode demorar a decidir buscando perfeição.' },
};

/** Cada item: quatro frases, uma por perfil. O candidato escolhe a que mais parece com ele. Texto proprio da Innovation. */
export interface BehavioralItem { id: string; question: string; options: { text: string; profile: Profile }[] }
const RAW_ITEMS: [string, string, string, string, string][] = [
  ['Quando surge um problema, eu…', 'resolvo logo e sigo em frente', 'chamo as pessoas para pensar juntas', 'mantenho a calma e sigo o combinado', 'investigo a causa antes de agir'],
  ['No trabalho em equipe, eu costumo…', 'puxar a frente e definir o rumo', 'animar o grupo e conectar as pessoas', 'apoiar quem precisa e manter a harmonia', 'organizar as tarefas e conferir a qualidade'],
  ['O que mais me motiva é…', 'bater metas e vencer desafios', 'ser reconhecido e conhecer gente nova', 'ter segurança e um ambiente tranquilo', 'fazer as coisas do jeito certo'],
  ['Diante de uma mudança repentina, eu…', 'aproveito a oportunidade na hora', 'fico animado com a novidade', 'prefiro entender com calma antes', 'quero saber os detalhes e as regras'],
  ['Meu jeito de falar é mais…', 'direto e objetivo', 'expressivo e cheio de exemplos', 'tranquilo e acolhedor', 'preciso e cuidadoso'],
  ['Em uma reunião, eu…', 'quero chegar logo à decisão', 'gosto de trocar ideias e falar bastante', 'escuto mais do que falo', 'trago dados e pergunto sobre os riscos'],
  ['O que mais me incomoda é…', 'lentidão e enrolação', 'trabalhar isolado e em silêncio', 'conflito e pressão constante', 'desorganização e erros'],
  ['Quando recebo uma tarefa nova, eu…', 'começo imediatamente', 'conto para os colegas e peço ideias', 'sigo o passo a passo que me passaram', 'planejo tudo antes de começar'],
  ['Pessoas próximas me descrevem como…', 'determinado(a)', 'comunicativo(a)', 'paciente', 'detalhista'],
  ['Sob pressão, eu…', 'assumo o controle', 'busco apoio e mantenho o bom humor', 'continuo firme no meu ritmo', 'me concentro e reviso tudo'],
  ['Prefiro ambientes de trabalho…', 'competitivos e dinâmicos', 'alegres e com muita interação', 'estáveis e colaborativos', 'organizados e com processos claros'],
  ['Ao tomar uma decisão, eu…', 'confio no meu instinto e decido rápido', 'considero como as pessoas vão se sentir', 'penso no que é mais seguro para todos', 'comparo as opções com cuidado'],
  ['Meu ponto forte é…', 'fazer acontecer', 'convencer e inspirar', 'ser confiável e constante', 'ser preciso e organizado'],
  ['Em um projeto longo, eu…', 'gosto mais do começo e da largada', 'mantenho o time engajado', 'sou quem segura o ritmo até o fim', 'cuido para que nada fique sem revisão'],
  ['Quando discordo de alguém, eu…', 'falo na hora o que penso', 'tento convencer com bom papo', 'evito brigar e busco um acordo', 'apresento fatos e argumentos'],
  ['No meu tempo livre, eu gosto de…', 'atividades com desafio e competição', 'encontrar amigos e sair', 'ficar em casa com quem eu gosto', 'ler, estudar ou montar algo com calma'],
];
export const BEHAVIORAL_ITEMS: BehavioralItem[] = RAW_ITEMS.map(([question, executor, comunicador, planejador, analista], index) => ({
  id: `b${index + 1}`,
  question,
  options: [
    { text: executor, profile: 'EXECUTOR' },
    { text: comunicador, profile: 'COMUNICADOR' },
    { text: planejador, profile: 'PLANEJADOR' },
    { text: analista, profile: 'ANALISTA' },
  ],
}));

/** Ordem das frases embaralhada por item (de forma fixa, para nao denunciar o perfil pela posicao). */
export function publicBehavioralItems() {
  return BEHAVIORAL_ITEMS.map((item, index) => {
    const shift = index % 4;
    const options = item.options.map((option, position) => ({ value: position, text: option.text }));
    return { id: item.id, question: item.question, options: [...options.slice(shift), ...options.slice(0, shift)] };
  });
}

/** Percentual de cada perfil (soma 100) e o predominante. Exige todas as respostas. */
export function scoreBehavioral(answers: Record<string, unknown>) {
  const items = BEHAVIORAL_ITEMS;
  const counts: Record<Profile, number> = { EXECUTOR: 0, COMUNICADOR: 0, PLANEJADOR: 0, ANALISTA: 0 };
  for (const item of items) {
    const choice = Number(answers[item.id]);
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) throw new BadRequestException('Responda todas as perguntas.');
    counts[item.options[choice].profile] += 1;
  }
  const total = items.length;
  const percent = Object.fromEntries((Object.keys(counts) as Profile[]).map((key) => [key, Math.round((counts[key] / total) * 100)])) as Record<Profile, number>;
  const dominant = (Object.keys(counts) as Profile[]).sort((a, b) => counts[b] - counts[a])[0];
  const secondary = (Object.keys(counts) as Profile[]).sort((a, b) => counts[b] - counts[a])[1];
  return { percent, dominant, secondary: counts[secondary] > 0 ? secondary : null };
}
